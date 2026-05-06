// DRAWER — Week Data
// Steps are placeholders until content is provided (S8+)

export const WEEKS = [
  {
    id: 1,
    title: 'Intro to AutoCAD',
    subtitle: '2D Geometric Construction',
    color: '#00d4ff',
    pivotObject: 'grid', // TBD
    steps: [
      {
        id: 1,
        title: 'Open AutoCAD',
        instruction: 'Launch AutoCAD → Create a New Drawing → Select "acadiso.dwt" template',
        detail: 'The template ensures metric units are set correctly for engineering drawings.',
        command: null,
      },
      // More steps to be added in S8
    ]
  },
  {
    id: 2,
    title: 'Conic Sections',
    subtitle: '& Special Curves',
    color: '#00bfff',
    pivotObject: 'ellipse',
    steps: []
  },
  {
    id: 3,
    title: 'Projection of Points & Lines',
    subtitle: 'Inclined to One Plane',
    color: '#0099ff',
    pivotObject: 'line',
    steps: []
  },
  {
    id: 4,
    title: 'Projection of Lines & Planes',
    subtitle: 'Multi-plane Analysis',
    color: '#0077ff',
    pivotObject: 'plane',
    steps: []
  },
  {
    id: 5,
    title: 'Orthographic Projection',
    subtitle: 'Simple Solids',
    color: '#0055ff',
    pivotObject: 'cube',
    steps: []
  },
  {
    id: 6,
    title: 'Orthographic Projection',
    subtitle: 'Polyhedrons & Revolution',
    color: '#3300ff',
    pivotObject: 'polyhedron',
    steps: []
  },
  {
    id: 7,
    title: 'Section of Solids',
    subtitle: 'Cut Views & Cross Sections',
    color: '#6600ff',
    pivotObject: 'cut-cone',
    steps: []
  },
  {
    id: 8,
    title: 'Development of Surfaces',
    subtitle: 'Unfolding 3D Forms',
    color: '#9900cc',
    pivotObject: 'unfolded',
    steps: []
  },
  {
    id: 9,
    title: 'Isometric Projection',
    subtitle: 'Solids in Isometric View',
    color: '#cc0099',
    pivotObject: 'isometric-cube',
    steps: []
  },
  {
    id: 10,
    title: 'Solid Modelling',
    subtitle: 'Primitives & Boolean Ops',
    color: '#ff0066',
    pivotObject: 'boolean',
    steps: []
  },
  {
    id: 11,
    title: 'Solid Modelling',
    subtitle: 'Features & Boolean Ops',
    color: '#ff3300',
    pivotObject: 'feature-solid',
    steps: []
  },
]

export const getWeek = (id) => WEEKS.find(w => w.id === Number(id))
