
'use strict';
// SCENARIO CONFIG — edit starting values here; all counts and inventory UI derive from this.
// Phase 4: pure dispatch and animation logic, connected to the SVG preview.
const CONFIG = {
  scenario: 'Building Collapse',
  patients: { fracture: 4, bloodloss: 4, unconscious: 3, limbloss: 2 },
  fleet: { count: 4, capacity: 2, bases: ['J2', 'J4', 'J8', 'J10'] },
  hospitals: [
    { id: 'H1', name: 'Apex Trauma Centre', node: 'H1', card: [40, 35], stock: { icu: 3, blood: 2, vent: 2, beds: 3 } },
    { id: 'H2', name: 'City General Hospital', node: 'H2', card: [860, 35], stock: { icu: 1, blood: 2, vent: 1, beds: 4 } },
    { id: 'H3', name: 'Regional Blood Bank & Multispecialty', node: 'H3', card: [40, 535], stock: { icu: 0, blood: 3, vent: 0, beds: 2 } },
    { id: 'H4', name: 'District Hospital', node: 'H4', card: [860, 535], stock: { icu: 2, blood: 1, vent: 1, beds: 2 } }
  ],
  incident: { node: 'INC', card: [475, 368] },
  // Schematic coordinates, not real streets or operational distances.
  nodes: {
    H1:[190,185], J2:[395,185], J3:[600,185], J4:[805,185], H2:[1010,185],
    J5:[190,340], J6:[395,340], INC:[600,305], J7:[805,340], J11:[1010,340],
    H3:[190,495], J8:[395,495], J9:[600,495], J10:[805,495], H4:[1010,495]
  },
  edges: [
    ['H1','J2'],['J2','J3'],['J3','J4'],['J4','H2'],
    ['H1','J5'],['J2','J6'],['J3','INC'],['J4','J7'],['H2','J11'],
    ['J5','J6'],['J6','INC'],['INC','J7'],['J7','J11'],
    ['J5','H3'],['J6','J8'],['J7','J10'],['J11','H4'],
    ['H3','J8'],['J8','J9'],['J9','J10'],['J10','H4']
  ]
};
// Presentation geometry. CONFIG and the graph's edge list remain unchanged.
// Use SCENE.nodes for geometric distances and the future A* heuristic alike.
const SCENE = {
  nodes: {
    H1:[170,195], J2:[320,240], J3:[535,175], J4:[850,275], H2:[1030,180],
    J5:[125,360], J6:[367,345], INC:[540,270], J7:[815,325], J11:[1060,370],
    H3:[210,510], J8:[330,475], J9:[537,519], J10:[745,535], H4:[1040,490]
  },
  incidentCard: [465,355],
  arterials: ['J2:J3','J3:J4','INC:J7','J7:J11']
};
// Locked future-phase rules: fallback ranks dual-resource coverage by min(available
// ICU, available blood/vent), then route cost; stuck vehicles retry on road changes.
// Dashboard belongs to Phase 4.5; deployment is outside this file's build scope.
