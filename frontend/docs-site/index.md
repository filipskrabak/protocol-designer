---
layout: home

hero:
  name: Protocol Designer
  text: Documentation
  tagline: Design, model, and verify network protocols
  actions:
    - theme: brand
      text: Get Started
      link: /guide/upload
    - theme: alt
      text: EFSM Guide
      link: /guide/efsm
    - theme: alt
      text: CPN Guide
      link: /guide/cpn

features:
  - title: Upload / New Protocol
    details: Start from scratch or load a previously exported SVG file. Your saved protocols are accessible from the library.
    link: /guide/upload
  - title: Protocol Header
    details: Add fields, set lengths, configure endianness and named values. Drag to reorder. Exports to SVG and P4.
    link: /guide/protocol-header
  - title: Properties
    details: Set the protocol name, author, version, and description. Save to the library so other protocols can encapsulate yours.
    link: /guide/properties
  - title: Encapsulation
    details: Model how one protocol is carried inside another. Map field values (e.g. EtherType) to child protocols.
    link: /guide/encapsulation
  - title: Extended FSM (EFSM)
    details: Build state machines with guarded transitions, variable assignments, and event annotations. Run structural verification.
    link: /guide/efsm
  - title: Colored Petri Nets (CPN)
    details: Model concurrent behavior with typed tokens. Verify deadlock-freedom, boundedness, and reachability with the built-in or server-side engine.
    link: /guide/cpn
---
