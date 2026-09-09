export default defineAppConfig({
  ui: {
    colors: { primary: 'ajk', secondary: 'ajk', neutral: 'zinc' },
    button: { slots: { base: 'min-h-11 cursor-pointer rounded-xl font-semibold' } },
    input: { slots: { base: 'min-h-11 rounded-xl', root: 'w-full' } },
    textarea: { slots: { base: 'rounded-xl', root: 'w-full' } },
    select: { slots: { base: 'min-h-11 rounded-xl' } },
    card: { slots: { root: 'rounded-2xl bg-default ring-default shadow-sm' } },
    modal: { slots: { content: 'rounded-2xl' } }
  }
})
