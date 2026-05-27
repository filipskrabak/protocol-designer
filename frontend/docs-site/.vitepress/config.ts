import { defineConfig } from 'vitepress'

export default defineConfig({
  base: '/docs/',
  title: 'Protocol Designer',
  description: 'Documentation for the Protocol Designer tool',
  cleanUrls: true,
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
    ],
    sidebar: [
      {
        text: 'Getting Started',
        items: [
          { text: 'Introduction', link: '/' },
          { text: 'Upload / New Protocol', link: '/guide/upload' },
        ],
      },
      {
        text: 'Protocol Design',
        items: [
          { text: 'Protocol Header', link: '/guide/protocol-header' },
          { text: 'Properties', link: '/guide/properties' },
          { text: 'Encapsulation', link: '/guide/encapsulation' },
        ],
      },
      {
        text: 'Behavior Modeling',
        items: [
          { text: 'Extended FSM (EFSM)', link: '/guide/efsm' },
          { text: 'Colored Petri Nets (CPN)', link: '/guide/cpn' },
        ],
      },
    ],
    socialLinks: [],
  },
})
