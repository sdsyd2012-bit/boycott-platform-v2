import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'

import { db } from '../db/database.js'
import { useToast } from '../admin/Toast.jsx'
import {
  ArrowRightIcon,
  ImageIcon,
  PlayIcon,
  RotateCwIcon,
  ScanIcon,
  SearchIcon,
  StopIcon,
  TriangleAlertIcon,
} from '../components/icons.jsx'

const BARCODE_FORMATS = [
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.CODABAR,
  Html5QrcodeSupportedFormats.QR_CODE,
]

function mapCameraError(error) {
  const message = String(error?.message || error?.name || '')
  if (/notallowed|denied|permission/i.test(message)) {
    return 'رفضت منح إذن الوصول إلى الكاميرا.'
  }
  if (/notfound|not found/i.test(message)) {
    return 'لم يتم العثور على كاميرا على هذا الجهاز.'
  }
  if (/notreadable|in use|trackstart/i.test(message)) {
    return 'الكاميرا مشغولة بواسطة تطبيق آخر.'
  }
  if (/https|secure/i.test(message)) {
    return 'الكاميرا تتطلب اتصالاً آمناً (HTTPS) أو localhost.'
  }
  return 'تعذّر تشغيل الكاميرا لسبب غير متوقع.'
}

const loadImageElement = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('تعذّر تحميل الصورة'))
    }
    img.src = url
  })

const canvasToFile = (canvas, name) =>
  new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(new File([blob], name, { type: 'image/png' }))
      } else {
        reject(new Error('تعذّر إنشاء الصورة المعالجة'))
      }
    }, 'image/png')
  })

// توحيد مقاس الصورة قبل الفحص: تكبير الصور الصغيرة وتصغير الكبيرة جداً،
// حتى يتسنى للمفكك قراءة الباركود بوضوح أكبر.
const prepareImageFile = async (file) => {
  const img = await loadImageElement(file)
  const srcW = img.naturalWidth || img.width || 0
  const srcH = img.naturalHeight || img.height || 0
  const longest = Math.max(srcW, srcH)
  const target = longest > 1600 ? 1600 : longest < 640 ? 640 : longest
  const scale = target / longest
  const width = Math.max(1, Math.round(srcW * scale))
  const height = Math.max(1, Math.round(srcH * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(img, 0, 0, width, height)
  return canvasToFile(canvas, 'barcode-prepared.png')
}

// محاولة ثانية: قص منطقة الوسط وتكبيرها ثم الفحص، تنجح غالباً
// عندما يكون الباركود صغيراً داخل الصورة الكبيرة.
const prepareZoomedFile = async (file, region = 0.5, zoom = 2) => {
  const img = await loadImageElement(file)
  const srcW = img.naturalWidth || img.width || 0
  const srcH = img.naturalHeight || img.height || 0
  const cropW = Math.round(srcW * region)
  const cropH = Math.round(srcH * region)
  const sx = Math.round((srcW - cropW) / 2)
  const sy = Math.round((srcH - cropH) / 2)
  const canvas = document.createElement('canvas')
  canvas.width = Math.min(cropW * zoom, 2000)
  canvas.height = Math.min(cropH * zoom, 2000)
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, sx, sy, cropW, cropH, 0, 0, canvas.width, canvas.height)
  return canvasToFile(canvas, 'barcode-zoomed.png')
}

const decodeFileWithScanner = async (scanner, file) => {
  const results = await scanner.scanFileV2(file, false)
  return results?.[0]?.decodedText || ''
}

export default function ScannerPage() {
  const navigate = useNavigate()
  const toast = useToast()

  const cameraScannerRef = useRef(null)
  const startPromiseRef = useRef(null)
  const fileScannerRef = useRef(null)
  const currentCameraIdRef = useRef(null)
  const handledRef = useRef(false)
  const fileInputRef = useRef(null)
  const manualRef = useRef(null)

  const [cameras, setCameras] = useState([])
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraStarting, setCameraStarting] = useState(false)
  const [cameraError, setCameraError] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [fileScanning, setFileScanning] = useState(false)
  const [manualCode, setManualCode] = useState('')

  const lookupAndNavigate = useCallback(
    async (code) => {
      const normalized = String(code).trim()
      try {
        let product = await db.products.get(normalized)
        if (!product) {
          product = await db.products
            .filter((item) => Array.isArray(item.barcodes) && item.barcodes.includes(normalized))
            .first()
        }
        navigate(`/product/${product ? product.barcode : normalized}${product ? '' : '?scan=1'}`)
      } catch {
        navigate(`/product/${normalized}?scan=1`)
      }
    },
    [navigate],
  )

  const stopCamera = useCallback(async () => {
    const scanner = cameraScannerRef.current
    if (!scanner) return
    cameraScannerRef.current = null

    try {
      if (startPromiseRef.current) await startPromiseRef.current.catch(() => {})
    } catch {
      /* تجاهل */
    }
    startPromiseRef.current = null

    try {
      if (scanner.isScanning) await scanner.stop()
    } catch {
      /* تجاهل أخطاء الإيقاف */
    }
    try {
      await scanner.clear()
    } catch {
      /* تجاهل أخطاء التنظيف */
    }
    setCameraActive(false)
    setCameraError(null)
  }, [])

  const handleDecoded = useCallback(
    (text) => {
      const code = String(text).trim()
      if (!code || handledRef.current) return
      handledRef.current = true

      if (typeof navigator.vibrate === 'function') navigator.vibrate(200)

      setCameraStarting(false)
      stopCamera()

      toast.success(`تم قراءة الباركود: ${code}`)
      lookupAndNavigate(code)
    },
    [stopCamera, toast, lookupAndNavigate],
  )

  const startCamera = useCallback(
    async (cameraId) => {
      if (cameraScannerRef.current?.isScanning) return
      try {
        if (!cameraScannerRef.current) {
          cameraScannerRef.current = new Html5Qrcode('scanner-camera', false)
        }
      } catch (error) {
        setCameraError(mapCameraError(error))
        return
      }
      currentCameraIdRef.current = cameraId
      setCameraError(null)
      setCameraStarting(true)

      const scanner = cameraScannerRef.current
      const startPromise = scanner.start(
        cameraId,
        {
          fps: 10,
          formatsToSupport: BARCODE_FORMATS,
          qrbox: (viewfinderWidth, viewfinderHeight) => ({
            width: Math.max(50, Math.floor(viewfinderWidth * 0.88)),
            height: Math.max(50, Math.floor(viewfinderHeight * 0.42)),
          }),
        },
        (decodedText) => handleDecoded(decodedText),
        () => {
          /* أخطاء الإطارات الفردية تُتجاهل */
        },
      )
      startPromiseRef.current = startPromise

      try {
        await startPromise
        if (cameraScannerRef.current === scanner) {
          setCameraActive(true)
        }
      } catch (error) {
        if (cameraScannerRef.current === scanner) {
          setCameraActive(false)
          setCameraError(mapCameraError(error))
          cameraScannerRef.current = null
          scanner.clear().catch(() => {})
        }
      } finally {
        if (startPromiseRef.current === startPromise) startPromiseRef.current = null
        setCameraStarting(false)
      }
    },
    [handleDecoded],
  )

  const handleToggleCamera = useCallback(async () => {
    if (cameraActive || cameraStarting) {
      handledRef.current = false
      await stopCamera()
      return
    }
    handledRef.current = false
    if (cameras.length > 0) {
      await startCamera(currentCameraIdRef.current || cameras[0].id)
    } else {
      toast.error('لا توجد كاميرا متاحة على هذا الجهاز، استخدم رفع الصورة أو الإدخال اليدوي')
    }
  }, [cameraActive, cameraStarting, cameras, startCamera, stopCamera, toast])

  const handleSwitchCamera = useCallback(async () => {
    if (cameras.length < 2 || !cameraActive) return
    const currentIndex = Math.max(
      0,
      cameras.findIndex((camera) => camera.id === currentCameraIdRef.current),
    )
    const next = cameras[(currentIndex + 1) % cameras.length]
    await stopCamera()
    await startCamera(next.id)
  }, [cameras, cameraActive, stopCamera, startCamera])

  const scanImageFile = useCallback(
    async (file) => {
      if (!file) return
      if (!file.type.startsWith('image/')) {
        toast.error('الرجاء اختيار ملف صورة يحتوي على باركود')
        return
      }
      setFileScanning(true)
      try {
        if (!fileScannerRef.current) {
          fileScannerRef.current = new Html5Qrcode('scanner-file', false)
        }
        let decodedText = ''
        try {
          const prepared = await prepareImageFile(file)
          decodedText = await decodeFileWithScanner(fileScannerRef.current, prepared)
        } catch {
          /* جرّب الطريقة البديلة بالأسفل */
        }
        if (!decodedText) {
          try {
            const zoomed = await prepareZoomedFile(file)
            decodedText = await decodeFileWithScanner(fileScannerRef.current, zoomed)
          } catch {
            /* جرّب الطريقة البديلة بالأسفل */
          }
        }
        if (decodedText) {
          handleDecoded(decodedText)
        } else {
          toast.error(
            'لم يُقرأ الباركود من هذه الصورة. تأكد من وضوحه وأنه مضبوط بالكامل داخل الإطار ' +
              'وبإضاءة جيدة، أو جرّب صورة أقرب وأوضح.',
          )
        }
      } catch {
        toast.error('تعذّرت معالجة الصورة، تأكد من أنها صورة سليمة أو استخدم الإدخال اليدوي')
      } finally {
        setFileScanning(false)
      }
    },
    [handleDecoded, toast],
  )

  const handleManualSubmit = useCallback(
    (event) => {
      event.preventDefault()
      const code = manualCode.trim()
      if (!code) {
        toast.error('أدخل رقم الباركود أولاً')
        return
      }
      if (typeof navigator.vibrate === 'function') navigator.vibrate(200)
      lookupAndNavigate(code)
    },
    [manualCode, lookupAndNavigate, toast],
  )

  useEffect(() => {
    let cancelled = false

    async function initCamera() {
      setCameraStarting(true)
      try {
        const devices = await Html5Qrcode.getCameras()
        if (cancelled) return
        setCameras(devices)
        if (devices.length > 0) {
          await startCamera(devices[0].id)
        } else {
          setCameraError('لم يتم العثور على كاميرا على هذا الجهاز.')
        }
      } catch (error) {
        if (cancelled) return
        setCameraError(mapCameraError(error))
      } finally {
        if (!cancelled) setCameraStarting(false)
      }
    }

    initCamera()

    return () => {
      cancelled = true
      const scanner = cameraScannerRef.current
      cameraScannerRef.current = null
      if (scanner) {
        const closeIt = async () => {
          try {
            if (startPromiseRef.current) await startPromiseRef.current.catch(() => {})
          } catch {
            /* تجاهل */
          }
          try {
            if (scanner.isScanning) await scanner.stop()
          } catch {
            /* تجاهل أخطاء الإيقاف */
          }
          try {
            await scanner.clear()
          } catch {
            /* تجاهل أخطاء التنظيف */
          }
        }
        closeIt()
      }
    }
  }, [startCamera])

  const scanlineVisible = cameraActive || cameraStarting

  return (
    <section className="py-6 md:py-16">
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400 transition hover:text-emerald-600 dark:hover:text-emerald-400"
        >
          <ArrowRightIcon className="h-4 w-4" />
          العودة إلى الرئيسية
        </Link>

        <div className="mt-4 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-emerald-600 shadow-sm dark:border-white/10 dark:bg-slate-900">
            <ScanIcon className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl dark:text-white">
              الماسح الذكي
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              امسح الباركود بالكاميرا، أو ارفع صورة له، أو أدخله يدوياً لمعرفة وضعه فوراً.
            </p>
          </div>
        </div>

        <div className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800/80 dark:bg-slate-900/40 dark:backdrop-blur-md">
          <div className="space-y-10 p-5 sm:p-8">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                  <PlayIcon className="h-4 w-4 text-emerald-500" />
                  الكاميرا الحية
                </h2>

                <div className="flex items-center gap-2">
                  {cameras.length > 1 && (
                    <button
                      type="button"
                      onClick={handleSwitchCamera}
                      disabled={!cameraActive}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:text-emerald-600 disabled:opacity-40 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-emerald-400"
                    >
                      <RotateCwIcon className="h-3.5 w-3.5" />
                      تبديل الكاميرا
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleToggleCamera}
                    disabled={cameraStarting}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {cameraActive ? (
                      <>
                        <StopIcon className="h-3.5 w-3.5" />
                        إيقاف الكاميرا
                      </>
                    ) : (
                      <>
                        <PlayIcon className="h-3.5 w-3.5" />
                        تشغيل الكاميرا
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div
                className={`relative mt-4 aspect-[4/5] w-full overflow-hidden rounded-2xl border bg-slate-950 transition sm:aspect-video ${
                  cameraError
                    ? 'border-rose-500/30'
                    : 'border-slate-800/80'
                }`}
              >
                {cameraError ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-950 p-6">
                    <div className="max-w-sm text-center">
                      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400">
                        <TriangleAlertIcon className="h-6 w-6" />
                      </span>
                      <p className="mt-4 text-sm font-bold text-white">
                        تعذّر الوصول إلى الكاميرا
                      </p>
                      <p className="mt-1.5 text-sm leading-relaxed text-slate-400">
                        {cameraError} يمكنك استخدام رفع الصورة أو الإدخال اليدوي بالأسفل.
                      </p>
                      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={handleToggleCamera}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/5"
                        >
                          <RotateCwIcon className="h-3.5 w-3.5" />
                          إعادة المحاولة
                        </button>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700"
                        >
                          <ImageIcon className="h-3.5 w-3.5" />
                          رفع صورة
                        </button>
                        <button
                          type="button"
                          onClick={() => manualRef.current?.scrollIntoView({ behavior: 'smooth' })}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700"
                        >
                          الإدخال اليدوي
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div id="scanner-camera" className="absolute inset-0" aria-hidden="true" />
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-0 z-10"
                      style={{ padding: '7%' }}
                    >
                      <div className="relative h-full w-full">
                        <span className="absolute -top-px -right-px h-7 w-7 rounded-tr-2xl border-t-2 border-r-2 border-emerald-500/80" />
                        <span className="absolute -top-px -left-px h-7 w-7 rounded-tl-2xl border-t-2 border-l-2 border-emerald-500/80" />
                        <span className="absolute -bottom-px -right-px h-7 w-7 rounded-br-2xl border-b-2 border-r-2 border-emerald-500/80" />
                        <span className="absolute -bottom-px -left-px h-7 w-7 rounded-bl-2xl border-b-2 border-l-2 border-emerald-500/80" />
                      </div>
                    </div>

                    {scanlineVisible && (
                      <div
                        aria-hidden
                        className="pointer-events-none absolute inset-x-[12%] z-10 animate-[scanline_2.2s_ease-in-out_infinite]"
                      >
                        <div className="h-0.5 w-full rounded-full bg-emerald-500 shadow-[0_0_12px_2px_rgba(16,185,129,0.8)]" />
                      </div>
                    )}

                    {!cameraActive && !cameraStarting && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/85 text-center">
                        <ScanIcon className="h-9 w-9 text-slate-600" />
                        <p className="text-sm font-medium text-slate-400">
                          الكاميرا متوقفة — اضغط «تشغيل الكاميرا» للمسح
                        </p>
                      </div>
                    )}

                    {cameraStarting && (
                      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-slate-950/85 text-center">
                        <span className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                        <p className="text-sm font-medium text-slate-300">
                          جارِ تفعيل الكاميرا، انتظر الموافقة…
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>

              <p className="mt-3 text-center text-xs text-slate-500 dark:text-slate-400">
                {cameraActive
                  ? 'وجّه الكاميرا نحو الباركود داخل الإطار لقراءته تلقائياً.'
                  : 'قم بتشغيل الكاميرا وامنح الإذن عند الطلب لبدء المسح.'}
              </p>
            </div>

            <div className="flex items-center gap-4" aria-hidden>
              <span className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                أو
              </span>
              <span className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
            </div>

            <div>
              <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                <ImageIcon className="h-4 w-4 text-emerald-500" />
                امسح من صورة
              </h2>

              <div
                onDragOver={(event) => {
                  event.preventDefault()
                  setDragging(true)
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                  event.preventDefault()
                  setDragging(false)
                  scanImageFile(event.dataTransfer.files?.[0])
                }}
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') fileInputRef.current?.click()
                }}
                className={`mt-4 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition ${
                  dragging
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-slate-300 hover:border-emerald-400 hover:bg-emerald-500/5 dark:border-white/15'
                }`}
              >
                {fileScanning ? (
                  <>
                    <span className="h-7 w-7 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                      جارِ قراءة الباركود من الصورة…
                    </p>
                  </>
                ) : (
                  <>
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <ImageIcon className="h-6 w-6" />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                        اسحب صورة الباركود وأفلتها هنا
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        أو اضغط لاختيار ملف من الجهاز (مناسب للحواسيب والهواتف)
                      </p>
                    </div>
                  </>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  scanImageFile(event.target.files?.[0])
                  event.target.value = ''
                }}
              />
              <div id="scanner-file" className="hidden" aria-hidden="true" />
            </div>

            <div className="flex items-center gap-4" aria-hidden>
              <span className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                أو
              </span>
              <span className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
            </div>

            <div ref={manualRef}>
              <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                <SearchIcon className="h-4 w-4 text-emerald-500" />
                الإدخال اليدوي
              </h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                تعذّر المسح بالكاميرا؟ اكتب رقم الباركود كما يظهر تحت رمز الشركة.
              </p>

              <form
                onSubmit={handleManualSubmit}
                className="mt-4 flex flex-col gap-3 sm:flex-row"
              >
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={manualCode}
                  onChange={(event) => setManualCode(event.target.value.replace(/\s/g, ''))}
                  placeholder="مثال: 7622201061207"
                  className="h-14 flex-1 rounded-xl border border-slate-300 bg-white px-4 text-center font-mono text-xl tracking-widest text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 dark:border-white/15 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500"
                />
                <button
                  type="submit"
                  className="inline-flex h-14 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-8 text-base font-bold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.98]"
                >
                  <SearchIcon className="h-5 w-5" />
                  بحث
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
