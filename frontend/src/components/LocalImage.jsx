import { useEffect, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'

import { db } from '../db/database.js'
import {
  ensureLocalImage,
  isApiLocalUrl,
  isRemoteUrl,
  ownerImageId,
  productOwnerId,
  resolveImage,
  resolveProductImage,
} from '../services/imageService.js'
import { ImageIcon } from './icons.jsx'

/**
 * مكوّن عرض الصور المحلي (Local-First).
 * لا يعرض أي رابط خارجي مباشرة: يستخدم المحلي، ثم pipeline التنزيل،
 * وإلا fallback. يتفاعل تلقائياً مع جدول images في Dexie.
 */
export default function LocalImage({
  ownerId,
  sourceUrl,
  alt = '',
  imgClassName = '',
  fallbackClassName = '',
  children,
}) {
  const id = useMemo(() => ownerImageId(ownerId), [ownerId])
  const record = useLiveQuery(() => db.images.get(id), [id])

  useEffect(() => {
    if (ownerId && (isRemoteUrl(sourceUrl) || isApiLocalUrl(sourceUrl))) {
      ensureLocalImage({ ownerId, sourceUrl })
    }
  }, [ownerId, sourceUrl])

  const resolved = resolveImage({ sourceUrl }, record)
  const objectUrl = useMemo(
    () =>
      resolved.state === 'ready' && resolved.blob
        ? URL.createObjectURL(resolved.blob)
        : null,
    [resolved.state, resolved.blob],
  )
  useEffect(() => () => {
    if (objectUrl) URL.revokeObjectURL(objectUrl)
  }, [objectUrl])

  if (resolved.state === 'local' || resolved.state === 'ready') {
    return (
      <img
        src={objectUrl || resolved.src}
        alt={alt}
        loading="lazy"
        className={imgClassName}
      />
    )
  }

  return (
    <span className={fallbackClassName}>
      {children || <ImageIcon className="h-6 w-6" />}
    </span>
  )
}

/** نسخة مختصرة للمنتجات: تستخرج ownerId ورابط الصورة من كائن المنتج. */
export function ProductImage({ product, ...rest }) {
  const barcode = product?.barcode
  const sourceUrl = product?.image_url || product?.logo_url || ''

  if (barcode == null || barcode === '') {
    const resolved = resolveProductImage(product, undefined)
    if (resolved.state === 'local' || resolved.state === 'ready') {
      return (
        <img
          src={resolved.src}
          alt={rest.alt || ''}
          loading="lazy"
          className={rest.imgClassName || ''}
        />
      )
    }
    return (
      <span className={rest.fallbackClassName || ''}>
        {rest.children || <ImageIcon className="h-6 w-6" />}
      </span>
    )
  }

  return (
    <LocalImage
      ownerId={productOwnerId(barcode)}
      sourceUrl={sourceUrl}
      {...rest}
    />
  )
}
