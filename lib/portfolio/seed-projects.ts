import type { PortfolioProject } from '@/types/portfolio'

// The four launch projects. The same content is seeded into portfolio_projects
// by migration; this copy only renders when Supabase isn't configured (local
// dev without env) or the read fails, so the page never ships empty.
export const SEED_PROJECTS: PortfolioProject[] = [
  {
    slug: 'mars-rover-spectrometer-hat',
    title: 'Mars Rover Spectrometer HAT',
    eyebrow: 'Boiler Robotics · Fall 2026 · In progress',
    summary:
      "A Raspberry Pi HAT and spectrometer breakout that connects the science modules on the club's Mars rover.",
    tags: ['KiCad', 'PCB design', 'Raspberry Pi'],
    linkLabel: 'Read write-up',
    facts: [
      { label: 'Team', value: 'Boiler Robotics, Purdue' },
      { label: 'Role', value: 'PCB designer' },
      { label: 'Timeline', value: 'Fall 2026 – present' },
      { label: 'Tools', value: 'KiCad, Raspberry Pi' },
    ],
    body: `## Overview

Boiler Robotics is building a Mars rover, and its science payload has to sample, measure and report back to the rover's onboard computer. I'm designing the electronics that tie that payload together: a Raspberry Pi HAT and a breakout board for the spectrometer.

## The problem

Each science module needs power, a data connection and a clean path to the Pi. Hand-wiring every module makes the payload fragile, slow to service between test runs and hard for the next person to understand.

## What I'm building

- **A HAT that stacks on the Raspberry Pi.** One board brings power and signals for the science modules onto a single, keyed interface instead of a nest of jumper wires.
- **A spectrometer breakout.** The sensor can sit where it needs to look, while the Pi stays protected in the electronics bay.
- **Designed in KiCad** to the Raspberry Pi HAT form factor, so it mounts like any other HAT and survives a rover's vibration.

## Where it stands

Schematic and layout are in progress this semester. Next comes fabrication, board bring-up and integration with the rover's software.

## What I'm learning

Designing to someone else's mechanical and electrical constraints: a fixed mounting envelope, a shared power budget and a team that has to be able to maintain the board after I hand it off.`,
    coverUrl: null,
    gallery: [],
    links: [],
    updatedAt: '2026-11-05T00:00:00.000Z',
  },
  {
    slug: 'sound-reactive-led-light-bars',
    title: 'Sound-Reactive LED Light Bars',
    eyebrow: 'Personal · Oct 2026 – present',
    summary:
      'Addressable light bars on a custom PCB, driven by audio and controlled from Google Home and Dorm OS. Board, CAD and firmware end to end.',
    tags: ['Custom PCB', 'Firmware', 'IoT'],
    linkLabel: 'Build log',
    facts: [
      { label: 'Role', value: 'Solo build' },
      { label: 'Timeline', value: 'Oct 2026 – present' },
      { label: 'Scope', value: 'PCB, CAD, firmware' },
      { label: 'Control', value: 'Google Home, Dorm OS' },
    ],
    body: `## Overview

A set of addressable LED light bars that react to music in real time. I'm building every layer myself: the circuit board, the mounting hardware and the firmware.

## How it works

1. **Listen.** The board takes in audio and the firmware breaks it into levels the lights can follow.
2. **Light.** Those levels drive the addressable LEDs, so the bars pulse and shift with the music.
3. **Control.** The bars join my smart home: Google Home handles voice control, and Dorm OS, a 3D model of my dorm room that I built, can switch them from the browser.

## Building it end to end

- **Board:** a custom PCB to power and drive the LED strips and bring audio in, instead of a breadboard and loose wiring.
- **CAD:** mounts and housings so the bars sit cleanly on the wall.
- **Firmware:** the audio processing, the lighting effects and the network control.

## Where it stands

The block diagram and parts are set and the build is underway. Next up: board layout, the first assembled bar and tuning the effects.`,
    coverUrl: null,
    gallery: [],
    links: [],
    updatedAt: '2026-11-05T00:00:00.000Z',
  },
  {
    slug: 'esp32-iot-display-panel',
    title: 'ESP32 IoT Display Panel',
    eyebrow: 'Solo build · Jun – Jul 2026',
    summary:
      'A room-mounted panel that streams 5+ live data feeds over MQTT and REST with under 2 s refresh. Firmware in C++.',
    tags: ['ESP32', 'C++', 'MQTT'],
    linkLabel: 'Read write-up',
    facts: [
      { label: 'Role', value: 'Solo build' },
      { label: 'Timeline', value: 'Jun – Jul 2026' },
      { label: 'Hardware', value: 'ESP32' },
      { label: 'Refresh', value: 'Under 2 s' },
    ],
    body: `## Overview

A display panel mounted on my wall that keeps 5+ live data feeds on screen at a glance. It runs on an ESP32 with firmware I wrote in C++.

## Architecture

- **MQTT for push.** Feeds that change often publish to the panel, so updates arrive as they happen instead of waiting for the next poll.
- **REST for pull.** Sources that only offer an HTTP API are fetched on a schedule.
- **One render loop.** Both paths feed the same screen, so every source looks and behaves the same on the display.

## Results

- 5+ feeds on one panel.
- Under 2 seconds from a change to it showing on screen.
- Runs on its own after power-up, with no laptop attached.

## What I took from it

Working inside a microcontroller's limits: memory, network reconnects and keeping the display responsive while data arrives in the background.`,
    coverUrl: null,
    gallery: [],
    links: [],
    updatedAt: '2026-11-05T00:00:00.000Z',
  },
  {
    slug: 'jarmsco',
    title: 'JARMSCO',
    eyebrow: 'Co-founder · Dec 2025 – May 2026',
    summary:
      'A multi-tenant field-service platform: 3 apps on one monorepo, row-level security across 4 role tiers, used by 5 pilot organizations.',
    tags: ['Next.js', 'PostgreSQL', 'Systems design'],
    linkLabel: 'Case study',
    facts: [
      { label: 'Role', value: 'Co-founder' },
      { label: 'Timeline', value: 'Dec 2025 – May 2026' },
      { label: 'Stack', value: 'Next.js, PostgreSQL' },
      { label: 'Pilots', value: '5 organizations' },
    ],
    body: `## Overview

JARMSCO is a field-service platform I co-founded: software for organizations that send people out to do work on site and need to schedule, track and report on it. Several organizations share one system, so keeping each one's data separate was the core engineering problem.

## Architecture

- **3 apps, 1 monorepo.** The apps share types, data access and UI, so a change to the data model lands everywhere at once.
- **Security in the database.** PostgreSQL row-level security enforces 4 role tiers, so a bug in one app can't expose another organization's records.
- **Next.js** for the apps, with PostgreSQL as the single source of truth.

## Pilots

5 pilot organizations ran on the platform. Their feedback shaped the roles, the workflows and what we built next.

## What I learned

Multi-tenant design has to start in the schema. Putting access rules in the database instead of scattering them through application code made every new feature safer by default.`,
    coverUrl: null,
    gallery: [],
    links: [],
    updatedAt: '2026-11-05T00:00:00.000Z',
  },
]
