import { toPng } from 'html-to-image'

type RevertFn = () => void

/**
 * Prepares a VueFlow canvas element for html-to-image capture.
 *
 * ROOT CAUSE: VueFlow renders edge arrowhead markers in a *dedicated* SVG
 * element (.vue-flow__marker) that is a sibling of the per-edge SVG elements
 * (.vue-flow__edges). Inside html-to-image's <foreignObject> serialization
 * context, `url(#markerId)` references cannot resolve across separate SVG
 * element boundaries — each SVG element is its own coordinate/reference scope
 * in the foreignObject rendering model. The result is black-filled path shapes
 * (SVG's default fill) because the marker reference is silently dropped.
 *
 * Secondary issue: `.vue-flow__edge-path { fill: none }` comes from an external
 * CSS file. That CSS is not available when the serialized SVG data URI is
 * rendered as an <img>. Without `fill: none`, paths default to black-fill.
 *
 * Fix:
 * 1. Clone each referenced marker def into the same <svg> as the path using it,
 *    so the url(#id) lookup always resolves locally.
 * 2. Inline `fill="none"` as an SVG presentation attribute on edge paths so
 *    the attribute survives CSS-less rendering.
 * 3. Inline `fill="white"` on VueFlow edge label backgrounds (.vue-flow__edge-textbg).
 *
 * All mutations are reverted after toPng completes so the live canvas is unaffected.
 */
function prepareVueFlowForCapture(container: HTMLElement): RevertFn[] {
  const reverts: RevertFn[] = []

  // --- Step 1: Collect all marker definitions keyed by id ---
  const markerMap = new Map<string, SVGMarkerElement>()
  container.querySelectorAll<SVGMarkerElement>('marker[id]').forEach((m) => {
    markerMap.set(m.id, m)
  })

  if (markerMap.size > 0) {
    // Process each SVG that has paths referencing markers
    const processedSvgs = new Set<SVGSVGElement>()

    container.querySelectorAll<SVGElement>('[marker-end], [marker-start]').forEach((pathEl) => {
      const svg = pathEl.closest<SVGSVGElement>('svg')
      if (!svg || processedSvgs.has(svg)) return
      processedSvgs.add(svg)

      // Collect all marker IDs referenced within this SVG
      const referencedIds = new Set<string>()
      svg.querySelectorAll<SVGElement>('[marker-end], [marker-start]').forEach((p) => {
        for (const attr of ['marker-end', 'marker-start']) {
          const id = p.getAttribute(attr)?.match(/url\(["']?#([^"')]+)["']?\)/)?.[1]
          if (id) referencedIds.add(id)
        }
      })

      if (referencedIds.size === 0) return

      // Ensure this SVG has a <defs> element
      let defs = svg.querySelector<SVGDefsElement>(':scope > defs')
      let addedDefs = false
      if (!defs) {
        defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
        svg.insertBefore(defs, svg.firstChild)
        addedDefs = true
      }

      const addedMarkers: SVGMarkerElement[] = []
      referencedIds.forEach((id) => {
        // Skip if this SVG already defines this marker
        if (svg.querySelector(`#${CSS.escape(id)}`)) return
        const original = markerMap.get(id)
        if (!original) return
        const clone = original.cloneNode(true) as SVGMarkerElement
        defs!.appendChild(clone)
        addedMarkers.push(clone)
      })

      reverts.push(() => {
        addedMarkers.forEach((m) => m.parentNode?.removeChild(m))
        if (addedDefs && defs?.parentNode) defs.parentNode.removeChild(defs)
      })
    })
  }

  // --- Step 2: Inline critical SVG presentation attributes ---
  const attrPatches: Array<[SVGElement, string, string | null]> = []

  const patch = (el: SVGElement, attr: string, value: string) => {
    const prev = el.hasAttribute(attr) ? el.getAttribute(attr) : null
    el.setAttribute(attr, value)
    attrPatches.push([el, attr, prev])
  }

  // Edge paths: fill must be "none" — comes from .vue-flow__edge-path CSS class
  // which isn't available in the data-URI rendering context
  container.querySelectorAll<SVGPathElement>('.vue-flow__edge-path').forEach((path) => {
    patch(path, 'fill', 'none')
  })

  // Edge label backgrounds: fill must be "white"
  container.querySelectorAll<SVGRectElement>('.vue-flow__edge-textbg').forEach((rect) => {
    patch(rect, 'fill', 'white')
  })

  reverts.push(() => {
    attrPatches.forEach(([el, attr, prev]) => {
      if (prev === null) el.removeAttribute(attr)
      else el.setAttribute(attr, prev)
    })
  })

  return reverts
}

export async function downloadCanvasPng(element: HTMLElement, filename: string): Promise<void> {
  const reverts = prepareVueFlowForCapture(element)
  try {
    const dataUrl = await toPng(element, {
      backgroundColor: '#ffffff',
      skipFonts: true,
    })
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = filename
    a.click()
  } finally {
    reverts.forEach((fn) => fn())
  }
}

