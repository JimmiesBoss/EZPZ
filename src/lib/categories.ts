export type Tier = "T1" | "T2" | "T3";

export interface Subcategory {
  id: string;
  label: string;
  examples: string[];
}

export interface Category {
  id: string;
  label: string;
  tier: Tier;
  waiverId: string;
  description: string;
  subcategories: Subcategory[];
  keywords: string[];
  rejectionTriggers: string[];
  expectedReturnRate: number;
}

export const CATEGORIES: Category[] = [
  {
    id: "automotive",
    label: "Automotive Parts",
    tier: "T1",
    waiverId: "automotive-v1",
    description: "OEM and aftermarket components for vehicles.",
    subcategories: [
      { id: "engine", label: "Engine Components", examples: ["alternator", "starter", "water pump", "gasket", "timing chain", "fuel injector", "thermostat"] },
      { id: "transmission", label: "Transmission & Drivetrain", examples: ["transmission", "differential", "axle", "u-joint", "cv joint", "torque converter"] },
      { id: "brake", label: "Brake System", examples: ["caliper", "rotor", "pads", "master cylinder", "brake line", "abs module"] },
      { id: "suspension", label: "Suspension & Steering", examples: ["control arm", "ball joint", "tie rod", "spring", "shock", "sway bar", "strut"] },
      { id: "cooling", label: "Cooling System", examples: ["radiator", "thermostat", "hose", "fan", "expansion tank", "water pump"] },
      { id: "electrical", label: "Electrical", examples: ["alternator", "starter", "battery", "wiring harness", "sensor", "relay", "ignition"] },
      { id: "body", label: "Body & Trim", examples: ["mirror", "trim", "weatherstripping", "lock", "hinge", "door panel", "window regulator"] },
      { id: "glass-lights", label: "Glass & Lights", examples: ["headlight", "taillight", "lens", "regulator", "indicator bulb"] },
    ],
    keywords: ["car", "truck", "vehicle", "automotive", "auto", "chevy", "ford", "toyota", "honda", "dodge", "ram", "bmw", "audi", "vw", "volkswagen", "subaru", "nissan", "mazda", "alternator", "radiator", "starter", "caliper", "rotor", "transmission", "engine", "ignition", "muffler", "exhaust", "tie rod", "control arm", "axle"],
    rejectionTriggers: ["pre-1970", "show car", "complete vehicle", "decorative car"],
    expectedReturnRate: 0.12,
  },
  {
    id: "appliance",
    label: "Small Appliance Parts",
    tier: "T1",
    waiverId: "appliance-v1",
    description: "Replacement components for household appliances.",
    subcategories: [
      { id: "laundry", label: "Washing Machine & Dryer", examples: ["motor", "belt", "drum", "seal", "control board", "heating element", "lint filter"] },
      { id: "fridge", label: "Refrigerator & Freezer", examples: ["compressor", "condenser", "fan", "thermostat", "ice maker", "gasket", "drain"] },
      { id: "microwave", label: "Microwave", examples: ["magnetron", "transformer", "capacitor", "waveguide", "turntable"] },
      { id: "dishwasher", label: "Dishwasher", examples: ["spray arm", "rack", "pump", "motor", "seal", "heating element"] },
      { id: "oven", label: "Ovens & Stoves", examples: ["heating element", "igniter", "burner", "thermostat", "rack", "hinge"] },
      { id: "small-kitchen", label: "Coffee Makers & Small Kitchen", examples: ["heating coil", "pump", "thermostat", "carafe"] },
      { id: "vacuum", label: "Vacuum & Floor Care", examples: ["motor", "belt", "brush", "filter", "hose"] },
      { id: "misc-appliance", label: "Miscellaneous Appliances", examples: ["toaster", "blender", "mixer", "slow cooker", "rice cooker", "hair dryer"] },
    ],
    keywords: ["washer", "dryer", "fridge", "refrigerator", "freezer", "dishwasher", "microwave", "oven", "stove", "range", "vacuum", "appliance", "lg", "samsung", "whirlpool", "ge", "kenmore", "bosch", "frigidaire", "maytag", "kitchenaid", "compressor", "magnetron"],
    rejectionTriggers: ["pre-1980", "complete appliance", "decorative kitchen"],
    expectedReturnRate: 0.1,
  },
  {
    id: "woodmetal",
    label: "Woodworking & Metalworking Equipment",
    tier: "T2",
    waiverId: "woodmetal-v1",
    description: "Components for stationary power tools, lathes, CNC, and shop equipment.",
    subcategories: [
      { id: "tablesaw", label: "Table Saws & Circular Saws", examples: ["blade", "belt", "pulley", "fence", "motor", "arbor", "blade guard"] },
      { id: "planer", label: "Planers & Jointers", examples: ["knives", "belt", "motor", "table", "feed mechanism"] },
      { id: "lathe", label: "Lathes", examples: ["chuck", "spindle bearing", "drive center", "tool rest", "tailstock"] },
      { id: "drillpress", label: "Drill Press", examples: ["chuck", "spindle", "table", "belt", "motor"] },
      { id: "sander", label: "Sanders", examples: ["belt", "drum", "pad", "motor"] },
      { id: "cnc", label: "CNC & Precision Equipment", examples: ["stepper motor", "ball screw", "control board", "spindle", "limit switch", "encoder"] },
      { id: "grinder", label: "Grinders & Metal Shop", examples: ["grinding wheel", "motor", "spindle", "magnetic chuck", "coolant"] },
      { id: "bits", label: "Specialty Bits & Cutters", examples: ["saw blade", "drill bit", "router bit", "collet"] },
    ],
    keywords: ["table saw", "lathe", "cnc", "planer", "jointer", "drill press", "sander", "grinder", "router", "stepper", "ball screw", "delta", "powermatic", "jet", "grizzly", "shopsmith", "haas"],
    rejectionTriggers: ["pre-1950 hand tool", "decorative tool", "complete working tool"],
    expectedReturnRate: 0.05,
  },
  {
    id: "sewing",
    label: "Sewing & Textile Equipment",
    tier: "T2",
    waiverId: "sewing-v1",
    description: "Replacement parts for sewing, overlock, and embroidery machines.",
    subcategories: [
      { id: "sewing-machine", label: "Sewing Machine Parts", examples: ["bobbin", "presser foot", "feed dog", "needle", "timing belt", "tension disc"] },
      { id: "serger", label: "Serger / Overlock Parts", examples: ["presser foot", "looper", "threading guide", "tension disc"] },
      { id: "industrial", label: "Industrial Sewing", examples: ["shuttle", "timing component", "stitch regulator", "heavy-duty motor"] },
      { id: "embroidery", label: "Embroidery Machines", examples: ["hoop", "motor", "needle bar", "design cartridge"] },
      { id: "fabric-cutting", label: "Fabric Cutting", examples: ["rotary blade", "cutting mat", "guide", "replacement head"] },
    ],
    keywords: ["sewing", "serger", "overlock", "embroidery", "bobbin", "presser foot", "singer", "brother", "janome", "juki", "bernina", "pfaff"],
    rejectionTriggers: ["pre-1960 sewing machine", "complete machine", "decorative sewing box"],
    expectedReturnRate: 0.06,
  },
  {
    id: "gaming",
    label: "Gaming & Arcade Equipment",
    tier: "T3",
    waiverId: "gaming-v1",
    description: "Components for game consoles, arcade machines, and retro systems.",
    subcategories: [
      { id: "console", label: "Game Consoles", examples: ["motherboard", "power supply", "control board", "cooling fan", "ribbon cable"] },
      { id: "arcade", label: "Arcade Machines", examples: ["pcb", "joystick", "button assembly", "monitor", "crt", "wiring harness"] },
      { id: "controllers", label: "Controllers & Peripherals", examples: ["analog stick", "trigger", "rumble motor", "circuit board", "charging port"] },
      { id: "retro-accessories", label: "Retro Gaming Accessories", examples: ["rf modulator", "av cable", "adapter", "cartridge reader"] },
    ],
    keywords: ["arcade", "console", "playstation", "xbox", "nintendo", "ps1", "ps2", "ps3", "ps4", "ps5", "snes", "n64", "sega", "atari", "joystick", "pcb", "crt", "rom", "controller", "neo geo"],
    rejectionTriggers: ["game cartridge", "signed memorabilia", "complete arcade", "rom software"],
    expectedReturnRate: 0.24,
  },
  {
    id: "photo",
    label: "Vintage Photography Equipment",
    tier: "T3",
    waiverId: "photo-v1",
    description: "Replacement components for film cameras, lenses, and darkroom equipment.",
    subcategories: [
      { id: "camera-bodies", label: "Camera Bodies & Mechanisms", examples: ["shutter", "mirror", "viewfinder", "light seal", "sprocket", "film advance"] },
      { id: "lenses", label: "Lenses & Optics", examples: ["lens element", "aperture blade", "focusing mechanism", "focus screen"] },
      { id: "meters-flash", label: "Light Meters & Flash", examples: ["photocell", "battery contact", "light sensor", "flash tube", "capacitor"] },
      { id: "darkroom", label: "Darkroom Equipment", examples: ["enlarger lens", "timer", "safelight", "chemical tray"] },
      { id: "viewfinders", label: "Viewfinders & Prisms", examples: ["prism", "focusing screen", "eyepiece", "magnifier"] },
    ],
    keywords: ["camera", "lens", "shutter", "darkroom", "enlarger", "viewfinder", "leica", "nikon", "canon", "pentax", "minolta", "hasselblad", "rolleiflex", "mamiya", "contax", "olympus"],
    rejectionTriggers: ["complete camera", "film stock", "photographic paper", "print", "negative"],
    expectedReturnRate: 0.15,
  },
  {
    id: "audio",
    label: "Vintage Audio & Hi-Fi Equipment",
    tier: "T3",
    waiverId: "audio-v1",
    description: "Components for vintage amplifiers, turntables, synths, mixing consoles, speakers, tape machines.",
    subcategories: [
      { id: "amp", label: "Amplifiers & Receivers", examples: ["12ax7", "el34", "6l6", "vacuum tube", "transformer", "capacitor", "crossover"] },
      { id: "turntable", label: "Turntables", examples: ["tonearm", "cartridge", "motor", "belt", "platter", "needle"] },
      { id: "synth", label: "Synthesizers & Keyboards", examples: ["oscillator", "power supply", "circuit board", "potentiometer", "keybed"] },
      { id: "console", label: "Mixing Consoles & Studio Gear", examples: ["fader", "knob", "switch", "i/o module", "power supply"] },
      { id: "speakers", label: "Speakers", examples: ["tweeter", "woofer", "crossover", "enclosure", "terminal"] },
      { id: "tape", label: "Tape Machines", examples: ["motor", "capstan", "pinch roller", "head assembly"] },
    ],
    keywords: ["amp", "amplifier", "tube", "turntable", "synth", "synthesizer", "mixer", "speaker", "tape", "fender", "marshall", "vox", "ampeg", "moog", "korg", "roland", "yamaha", "akai", "tascam", "neumann", "rca", "studer", "thorens", "technics", "12ax7", "el34", "6l6"],
    rejectionTriggers: ["complete amp", "vinyl record", "cassette tape", "decorative speaker"],
    expectedReturnRate: 0.13,
  },
  {
    id: "kitchen",
    label: "Commercial Kitchen & Cafe Equipment",
    tier: "T3",
    waiverId: "kitchen-v1",
    description: "Replacement parts for professional espresso, brewing, and commercial kitchen equipment.",
    subcategories: [
      { id: "espresso", label: "Espresso Machines", examples: ["group head", "steam wand", "pump seal", "solenoid valve", "heating element", "pressure gauge"] },
      { id: "grinder", label: "Coffee Grinders", examples: ["burr", "motor", "timer", "doser"] },
      { id: "brew", label: "Brewing Equipment", examples: ["filter basket", "portafilter", "shower screen"] },
      { id: "fryer", label: "Commercial Fryers & Warmers", examples: ["heating element", "thermostat", "timer", "drain"] },
      { id: "comm-fridge", label: "Commercial Refrigeration", examples: ["compressor", "fan", "thermostat", "door seal", "shelf"] },
      { id: "pos", label: "POS & Display Equipment", examples: ["heating lamp", "display motor", "lighting"] },
    ],
    keywords: ["espresso", "barista", "cafe", "commercial kitchen", "group head", "portafilter", "burr", "la marzocco", "synesso", "rancilio", "mahlkonig", "bunn", "fetco", "vitamix", "robot coupe", "hobart"],
    rejectionTriggers: ["coffee beans", "filters as primary", "complete machine", "decorative kitchen"],
    expectedReturnRate: 0.09,
  },
  {
    id: "tools",
    label: "Small Tools & Hand Tools",
    tier: "T2",
    waiverId: "tools-v1",
    description: "Specialty bits, blades, cutters, measuring tools, and tool components.",
    subcategories: [
      { id: "drill-bits", label: "Drill Bits & Chucks", examples: ["twist bit", "spade bit", "auger bit", "carbide bit", "drill chuck"] },
      { id: "saw-blades", label: "Saw Blades", examples: ["bandsaw blade", "jigsaw blade", "hand saw", "reciprocating blade"] },
      { id: "router-bits", label: "Router Bits & Cutters", examples: ["edge bit", "core box bit", "carbide cutter"] },
      { id: "measuring", label: "Measuring & Layout Tools", examples: ["measuring tape", "caliper", "level", "square", "depth gauge"] },
      { id: "fastening", label: "Fastening Tools", examples: ["screwdriver bit", "nutsetter", "impact socket"] },
      { id: "grinding", label: "Grinding & Sharpening", examples: ["grinding stone", "sharpening file", "honing stone"] },
      { id: "specialty", label: "Specialty Tools", examples: ["specialty wrench", "adapter", "trade-specific tool"] },
    ],
    keywords: ["drill bit", "saw blade", "router bit", "carbide", "bandsaw", "jigsaw", "caliper", "wrench", "socket", "milwaukee", "dewalt", "makita", "ridgid", "knipex"],
    rejectionTriggers: ["pre-1950 hand tool collectible", "decorative tool", "complete tool set collectible"],
    expectedReturnRate: 0.08,
  },
  {
    id: "agri",
    label: "Agricultural Equipment Parts",
    tier: "T1",
    waiverId: "agri-v1",
    description: "Components for tractors, combines, harvesters, irrigation, and farm machinery.",
    subcategories: [
      { id: "tractor", label: "Tractor Components", examples: ["fuel injector", "hydraulic cylinder", "seat assembly", "lighting", "hydraulic hose"] },
      { id: "combine", label: "Combine & Harvester Parts", examples: ["header", "threshing mechanism", "grain tank sensor"] },
      { id: "irrigation", label: "Irrigation & Water Systems", examples: ["pump", "valve", "filter", "nozzle", "pressure regulator"] },
      { id: "hay", label: "Hay & Forage Equipment", examples: ["baler belt", "roller", "cutterbar", "gear assembly"] },
      { id: "hitch", label: "Implement Hitches & Frames", examples: ["hitch assembly", "drawbar", "hydraulic connection"] },
      { id: "engines", label: "Engines & Powerplants", examples: ["fuel injector", "turbocharger", "cooling component", "gasket"] },
    ],
    keywords: ["tractor", "combine", "harvester", "baler", "irrigation", "farm", "agricultural", "john deere", "case ih", "kubota", "new holland", "massey ferguson", "claas", "deutz"],
    rejectionTriggers: ["seeds", "fertilizer", "decorative farm", "complete equipment"],
    expectedReturnRate: 0.06,
  },
  {
    id: "marine",
    label: "Marine & Boating Equipment",
    tier: "T1",
    waiverId: "marine-v1",
    description: "Replacement parts for boats, outboards, navigation, and marine machinery.",
    subcategories: [
      { id: "outboard", label: "Outboard Motors", examples: ["water pump", "fuel injector", "thermostat", "gasket", "spark plug", "propeller"] },
      { id: "nav", label: "Navigation & Electronics", examples: ["gps", "sonar transducer", "autopilot", "electrical panel"] },
      { id: "cabin", label: "Cabin Systems", examples: ["refrigeration", "water pump", "heating element", "plumbing"] },
      { id: "hull", label: "Hull & Exterior", examples: ["through-hull fitting", "portlight", "hatch hardware", "seal"] },
      { id: "steering", label: "Steering & Control", examples: ["hydraulic cylinder", "control cable", "steering quadrant"] },
      { id: "electrical", label: "Electrical Systems", examples: ["battery", "alternator", "charging system", "circuit breaker"] },
    ],
    keywords: ["boat", "marine", "outboard", "yacht", "sailboat", "yamaha marine", "mercury", "evinrude", "johnson", "honda marine", "suzuki marine", "garmin", "raymarine", "simrad"],
    rejectionTriggers: ["fuel", "oil", "life jacket", "decorative maritime", "complete boat"],
    expectedReturnRate: 0.07,
  },
];

export function getCategory(id: string): Category | undefined {
  return CATEGORIES.find((c) => c.id === id);
}

export function getSubcategory(categoryId: string, subId: string): Subcategory | undefined {
  return getCategory(categoryId)?.subcategories.find((s) => s.id === subId);
}

export const GLOBAL_REJECTION_PATTERNS: { pattern: RegExp; reason: string }[] = [
  { pattern: /\bcoin(s)?\b|\btrading card(s)?\b|\bsigned memorabilia\b|\bautograph(ed)?\b/i, reason: "Collectibles are out of scope." },
  { pattern: /\b(decor|decorative|ornament|wall art)\b/i, reason: "Decorative items are out of scope." },
  { pattern: /\bcomplete (working )?(vehicle|car|truck|boat|machine|appliance|console)\b/i, reason: "Complete working units are out of scope — try a vintage marketplace." },
  { pattern: /\b(food|perishable|grocer|cheese|wine)\b/i, reason: "Food and perishables are out of scope." },
  { pattern: /\b(clothing|apparel|jacket|jeans|sneaker|shoe)s?\b/i, reason: "Clothing is out of scope." },
  { pattern: /\b(rolex|gucci|louis vuitton|hermes|chanel)\b/i, reason: "Designer / luxury goods are out of scope (high counterfeiting risk)." },
  { pattern: /\b(fda|medical device|pacemaker|defibrillator)\b/i, reason: "FDA-regulated medical devices are out of scope." },
  { pattern: /\b(rom file|iso file|software license|game key|disc image)\b/i, reason: "Software, media, and ROMs are out of scope." },
];

export const STANDARD_REJECTION_COPY = (supportEmail: string) =>
  `We don't currently support that search. Parts Finder specializes in replacement components and functional parts for: ${CATEGORIES.map((c) => c.label).join(", ")}. Pick one of these categories and try again, or email ${supportEmail} if you think we should support yours.`;
