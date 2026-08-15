export const cleanDescription = (text) => {
  if (!text) return ''
  return String(text)
    .replace(/\*\*/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n+/g, ' ')
    .trim()
}

export const shortDescription = (text, max = 110) => {
  const clean = cleanDescription(text)
  if (!clean) return ''
  return clean.length > max ? `${clean.slice(0, max).trim()}…` : clean
}

export const resolveAlternatives = (brand, brandsById) => {
  if (brand.alternatives_text) {
    return brand.alternatives_text.replace(/\n+/g, ' - ')
  }
  if (brand.alternatives.length > 0) {
    return brand.alternatives.map((id) => brandsById[id]?.name || id).join('، ')
  }
  return ''
}

export function toBrand(product, categoryName = '') {
  const isAvoid = Boolean(product.is_boycotted)
  const barcodes = Array.isArray(product.barcodes) ? product.barcodes : []
  return {
    id: product.barcode,
    name: product.brand_name || product.name,
    status: isAvoid ? 'avoid' : 'support',
    description:
      product.reason ||
      (isAvoid ? 'يدعم الاحتلال ويستفيد من انتهاكاته' : 'بديل وطني آمن'),
    categories: categoryName ? [categoryName] : [],
    alternatives: [],
    alternatives_text: Array.isArray(product.alternatives)
      ? product.alternatives.filter(Boolean).join('، ')
      : '',
    logo_url: product.image_url || '',
    reasons: product.reason ? [product.reason] : [],
    barcode: product.barcode,
    barcodes,
    barcode_label: barcodes[0] || product.barcode,
  }
}
