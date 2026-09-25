// Catalogue data, carried over unchanged from the live homepage's RESOURCES array.
// Adding an entry here is the only edit a new tool needs: counts, filters and
// featured tiles are all derived from this list.
//
// kind:     "Revision Game" | "3D Model" | "Interactive". "Revision Game" is a Play tool,
//           everything else is an Explore tool.
// levels:   the key stages it covers, from "KS3" | "GCSE" | "A-Level". One entry shows
//           as that level; more than one shows as "Multi" and turns up under each.
// keywords: hidden synonym string, never rendered. It is what makes exam-language
//           searches land ("mass spec", "crude oil", "plum pudding").
// image:    16:10 screenshot under assets/img/tools/. Missing files fall back to a placeholder.
// featured: shown in the "Featured tools" row (order follows this list).
window.SST_TOOLS = [
  { title: "Time of Flight Tube", url: "visualisations/time-of-flight-mass-spectrometer/",
    blurb: "Fire ions down the drift tube, change the accelerating voltage and read the detector trace.",
    kind: "3D Model", levels: ["A-Level"], tags: ["AQA Chemistry", "Chemistry", "3D Model", "Interactive"],
    image: "tof-spectrometer.png", featured: true,
    keywords: "mass spec mass spectrometry tof time of flight isotopes relative atomic mass m/z ions drift tube 3.1.1.2" },

  { title: "Atomic Structure: Configurations, Orbitals & Ionisation", url: "visualisations/aqa-chemistry-hub/",
    blurb: "Fill the sub-levels by the rules, rotate the s and p orbitals, then read the jumps in ionisation energy.",
    kind: "Interactive", levels: ["A-Level"], tags: ["AQA Chemistry", "Chemistry", "3D Model", "Interactive"],
    image: "atomic-structure.png",
    keywords: "electron configuration electronic structure aufbau hund pauli exclusion orbital box diagram arrows sub-level sublevel energy level s p d 1s 2s 2p 3s 3p 3d 4s 4p overlap transition metal ion fe2+ fe3+ cu+ cu2+ cr3+ chromium copper anomaly exception noble gas shorthand argon core paired parallel spin shapes of orbitals spherical dumb-bell dumbbell nodal plane probability density electron cloud boundary surface 90% ionisation energy ionization successive first ie shell jump group period trend shielding nuclear charge evidence for sub-levels spin pairing repulsion kJ mol-1 3.1.1.2 3.1.1.3" },

  { title: "The Fractionating Column", url: "visualisations/fractional-distillation-column/",
    blurb: "Orbit the column, follow a single tray and watch the fractions separate by boiling point.",
    kind: "3D Model", levels: ["GCSE"], tags: ["AQA Chemistry", "Chemistry", "3D Model", "Interactive"],
    image: "fractionating-column.png", featured: true,
    keywords: "fractional distillation crude oil fractions hydrocarbons alkanes petrol diesel bitumen boiling point trays 4.7.1.2" },

  { title: "Extraction of Aluminium (beta)", url: "visualisations/aluminium-extraction/",
    blurb: "Switch on the current, watch the ions move and the anodes burn away, then revise and self-mark exam questions.",
    kind: "Interactive", levels: ["GCSE"], tags: ["AQA Chemistry", "Chemistry", "Interactive"],
    image: "aluminium-extraction.png",
    keywords: "aluminium aluminum extraction electrolysis bauxite alumina aluminium oxide al2o3 cryolite melting point 950 2000 electrolyte molten ions free to move cathode anode negative positive electrode carbon graphite lining steel anodes burn away replaced carbon dioxide co2 half equations al3+ 3e- 2o2- o2 4e- oxidation reduction oil rig panic reactivity series more reactive than carbon cost electricity recycling worksheet printable pdf revision notes exam questions mark scheme higher tier 4.4.3.3 5.4.3.3" },

  { title: "Periodic Table Explorer", url: "visualisations/aqa-periodic-table/",
    blurb: "Spotlight groups and periods, overlay trends and open any element, then quiz the class in presenter mode.",
    kind: "Interactive", levels: ["GCSE", "A-Level"], tags: ["AQA Chemistry", "Chemistry", "Interactive"],
    image: "periodic-table.png",
    keywords: "periodic table data sheet elements relative atomic mass ar atomic number proton number group period alkali metals group 1 halogens group 7 noble gases group 0 transition metals metals non-metals electronic structure 2,8,1 electron configuration 1s2 subshell s p d f block chromium copper anomaly oxidation states electronegativity pauling first ionisation energy ionization atomic radius ionic radius period 3 oxides chlorides amphoteric group 2 history of the periodic table dalton newlands law of octaves mendeleev gaps predictions gallium eka-aluminium germanium eka-silicon tellurium iodine swap moseley atomic number isotopes presenter mode whiteboard quiz slides powerpoint key plain black and white exam data sheet dark mode 32 column wide long form lanthanides actinides f-block inline 4.1.2 4.1.3 3.1.1.2 3.2.1 3.2.2 3.2.3 3.2.4 3.2.5" },

  { title: "Development of the Model of the Atom", url: "visualisations/atomic-model-timeline/",
    blurb: "Move through time from the solid sphere to the nuclear model, rotating each one as you go.",
    kind: "3D Model", levels: ["GCSE"], tags: ["AQA Chemistry", "Chemistry", "3D Model", "Interactive"],
    image: "atom-through-time.png", featured: true,
    keywords: "atomic model timeline dalton thomson plum pudding rutherford alpha scattering bohr chadwick nucleus higher tier 4.1.1.3" },

  { title: "The Spectroscopy Detective", url: "visualisations/spectroscopy-detective/",
    blurb: "Work case files of mystery molecules, logging IR, mass spec and NMR evidence to a final deduction.",
    kind: "Interactive", levels: ["A-Level"], tags: ["AQA Chemistry", "Chemistry", "Interactive"],
    image: "spectroscopy-detective.png",
    keywords: "spectroscopy organic analysis infrared ir mass spectrometry nmr proton carbon 13 fingerprint structure determination 3.3.6" },

  { title: "Shapes of Simple Molecules and Ions", url: "visualisations/shapes-of-simple-molecules/",
    blurb: "Orbit every AQA shape, switch the lone pairs on and off, then self-mark a four-mark explanation.",
    kind: "3D Model", levels: ["A-Level"], tags: ["AQA Chemistry", "Chemistry", "3D Model", "Interactive"],
    image: "shapes-of-molecules.png",
    keywords: "shapes of molecules vsepr bond angle lone pair bonding pair repulsion tetrahedral trigonal planar pyramidal octahedral bipyramidal linear non-linear bent square planar t-shaped 109.5 107 104.5 120 90 180 ammonia water methane bf3 becl2 pcl5 sf6 xef4 clf3 nh4+ pf6- 3.1.3.5" },

  { title: "Benzene: Structure & Delocalisation", url: "visualisations/aromatic-benzene-delocalisation/",
    blurb: "Compare the Kekulé and delocalised models in 3D, then drag benzene down onto its real energy level.",
    kind: "3D Model", levels: ["A-Level"], tags: ["AQA Chemistry", "Chemistry", "3D Model", "Interactive"],
    image: "benzene.png",
    keywords: "aromatic chemistry benzene arene delocalisation delocalised kekule cyclohexa-1,3,5-triene resonance stabilisation energy 152 enthalpy of hydrogenation 120 208 360 cyclohexene cyclohexane x-ray diffraction bond length 140 pm 134 154 electrophilic substitution addition bromine water halogen carrier pi electrons p orbitals sideways overlap planar regular hexagon 120 degrees 3.3.10" },

  { title: "3D Molecule Builder & IUPAC Naming (beta)", url: "visualisations/molecule-builder-iupac/",
    blurb: "Draw an organic molecule, read its IUPAC name and formula, then turn it round in 3D beside its mirror image.",
    kind: "Interactive", levels: ["GCSE", "A-Level"], tags: ["AQA Chemistry", "Chemistry", "3D Model", "Interactive"],
    image: "molecule-builder.png",
    keywords: "iupac nomenclature naming organic compounds molecule builder drawing editor displayed formula structural formula skeletal formula molecular formula relative molecular mass mr molar mass ball and stick model 3d homologous series general formula functional group alkane alkene alcohol carboxylic acid ester aldehyde ketone amine amide nitrile acyl chloride halogenoalkane haloalkane arene benzene phenol phenylamine longest chain locant prefix suffix stem methyl ethyl propyl branched isomer structural isomerism stereoisomerism optical isomers chiral centre chirality enantiomer mirror image non-superimposable asymmetric carbon lactic acid 2-hydroxypropanoic acid alanine e/z cis trans geometric isomerism but-2-ene vsepr bond angle 109.5 120 tetrahedral trigonal planar gcse a-level 4.7.1 4.7.2 4.7.3 3.3.1.1 3.3.1.2 3.3.1.3 3.3.7" },

  { title: "Organic Reaction Mechanisms", url: "visualisations/organic-reaction-mechanisms/",
    blurb: "Step through every AQA curly-arrow mechanism, then place the arrows yourself against the mark scheme.",
    kind: "Interactive", levels: ["A-Level"], tags: ["AQA Chemistry", "Chemistry", "Interactive"],
    image: "reaction-mechanisms.png",
    keywords: "organic mechanisms curly arrows electron pair movement free radical substitution initiation propagation termination homolytic fission fishhook chlorination methane electrophilic addition alkene ethene propene hbr bromine br2 sulfuric acid carbocation markownikoff nucleophilic substitution halogenoalkane bromoethane hydroxide cyanide ammonia hydrolysis elimination ethanolic koh dehydration alcohol nucleophilic addition carbonyl aldehyde ketone ethanal propanone nabh4 hydride kcn hydroxynitrile racemic addition-elimination acyl chloride ethanoyl chloride amide ester electrophilic substitution benzene nitration nitronium friedel crafts acylation acylium halogen carrier heterolytic delta positive lone pair leaving group intermediate 3.3.2 3.3.3 3.3.4 3.3.5 3.3.7 3.3.10 3.3.11 3.3.12 3.3.13" },

  { title: "LabSketch (beta): Apparatus Diagram Drawer", url: "visualisations/labsketch-apparatus-drawer/",
    blurb: "Draw lab apparatus from a vector library, or load a pre-drawn required practical, then export it.",
    kind: "Interactive", levels: ["GCSE"], tags: ["AQA Chemistry", "Chemistry", "Physics", "Interactive"],
    image: "labsketch.png",
    keywords: "lab apparatus diagram drawer chemix required practical rp worksheet exam paper svg png export beaker conical flask burette titration electrolysis bunsen burner tripod gauze retort stand clamp gas syringe measuring cylinder thermometer chromatography distillation liebig condenser eureka displacement can ripple tank circuit ammeter voltmeter variable resistor i-v characteristics density making salts neutralisation temperature changes rates of reaction identifying ions water purification" },

  { title: "Rate of Reaction & Collision Theory", url: "visualisations/rate-of-reaction-simulator/",
    blurb: "Set temperature, concentration and surface area, then watch the collisions and the graph respond.",
    kind: "Interactive", levels: ["GCSE"], tags: ["AQA Chemistry", "Chemistry", "Interactive"],
    image: "rate-of-reaction.png",
    keywords: "rates of reaction collision theory activation energy catalyst concentration temperature surface area particles 4.6.1" },

  { title: "Measuring Gas in Reactions (beta)", url: "visualisations/measuring-gas-production/",
    blurb: "Run the gas syringe, mass-loss and over-water setups, watch the live graphs build, then find the rate from a tangent.",
    kind: "Interactive", levels: ["GCSE"], tags: ["AQA Chemistry", "Chemistry", "Interactive"],
    image: "measuring-gas.png",
    keywords: "measuring gas produced gas collection rates of reaction required practical rp5 rp11 gas syringe plunger volume of gas cm3 mass loss balance cotton wool marble chips calcium carbonate hydrochloric acid carbon dioxide co2 magnesium ribbon hydrogen h2 hydrogen peroxide manganese dioxide mno2 catalyst oxygen o2 downward displacement of water collecting gas over water upturned inverted measuring cylinder burette trough solubility soluble insoluble density mean rate cm3/s g/s tangent gradient rate at a time volume time graph mass time graph sources of error improvements presenter mode slides worksheet printable pdf exam questions mark scheme higher tier 4.6.1.1 5.6.1.1" },

  { title: "Waves: Ripple Tank & Stretched String", url: "visualisations/waves-required-practical/",
    blurb: "Orbit the 3D apparatus, freeze the tank with a strobe, interfere two dippers and tune a string to resonance. AQA RP8 plus a BTEC addendum.",
    kind: "Interactive", levels: ["GCSE"], tags: ["AQA Physics", "Physics", "3D Model", "Interactive"],
    image: "waves-practical.png",
    keywords: "required practical 8 rp8 waves ripple tank water waves wavelength frequency wave speed v = f lambda stroboscope strobe dipper plane waves point source wavefront stretched string standing wave stationary wave vibration generator signal generator node antinode harmonic fundamental resonance tension pulley hanging masses mass per unit length metre rule apparatus set up diagram 3d lamp white screen projection two dippers two source interference superposition coherent coherence path difference phase difference constructive destructive maxima minima fringes btec applied science unit 1 c1 working with waves diffraction grating 4.6.1.2 4.6.1.3" },

  { title: "Mass vs Weight across the Solar System", url: "visualisations/mass-weight-solar-system/",
    blurb: "Weigh anything from a cat to a school bus on eleven worlds, then watch a spring balance stretch and an astronaut jump.",
    kind: "Interactive", levels: ["KS3"], tags: ["Physics", "Interactive"],
    image: "mass-weight.png",
    keywords: "mass weight difference w = m x g w=mg weight equals mass times gravitational field strength g n/kg newtons per kilogram 9.8 10 n/kg kilograms kg newtons n force of gravity gravity gravitational pull solar system planets sun mercury venus earth moon mars jupiter saturn uranus neptune pluto dwarf planet surface gravity weigh on other planets weightless weightlessness astronaut space newtonmeter newton meter spring balance forcemeter bathroom scales jump height moon jump dropping hammer feather apollo calculator worked examples rearrange quiz presenter mode whiteboard ks3 physics forces year 7 year 8 year 9" },

  { title: "Science Retrieval Presenter", url: "games/science/retrieval-quiz.html",
    blurb: "Timed recall across biology, chemistry and physics, mixing in earlier topics and required practicals.",
    kind: "Revision Game", levels: ["GCSE"], tags: ["Biology", "Chemistry", "Physics", "Revision Game", "Interactive"],
    image: "retrieval-presenter.png", featured: true,
    keywords: "retrieval practice recall starter plenary do now flashcard spaced interleaving quiz required practical rp paper 1 paper 2 foundation higher tier combined separate question bank editor timer" },

  { title: "Science Jeopardy", url: "games/science/science-jeopardy.html",
    blurb: "Board-style quiz across six categories, from cell biology to waves, electricity and space.",
    kind: "Revision Game", levels: ["GCSE"], tags: ["Biology", "Chemistry", "Physics", "Revision Game", "Interactive"],
    image: "science-jeopardy.png", featured: true,
    keywords: "jeopardy board quiz categories points starter plenary retrieval team game" },

  { title: "Science Blockbusters", url: "games/science/science-blockbusters.html",
    blurb: "Hexagon board head-to-head: answer to claim tiles and build a path across the grid.",
    kind: "Revision Game", levels: ["KS3", "GCSE"], tags: ["Biology", "Chemistry", "Physics", "Revision Game", "Interactive"],
    image: "science-blockbusters.png",
    keywords: "blockbusters hexagons letters board team game retrieval head to head" },

  { title: "Tenable Science", url: "games/science/tenable-science.html",
    blurb: "Name the top ten. List-based recall rounds that reward breadth over speed.",
    kind: "Revision Game", levels: ["KS3", "GCSE"], tags: ["Biology", "Chemistry", "Physics", "Revision Game"],
    image: "tenable-science.png",
    keywords: "tenable top ten list naming recall retrieval whole class reactivity series" },

  { title: "Who Dares Wins: Science", url: "games/science/who-dares-wins-science.html",
    blurb: "Bid, dare and bank the winnings in a list-naming game show for the whole class.",
    kind: "Revision Game", levels: ["KS3", "GCSE"], tags: ["Biology", "Chemistry", "Physics", "Revision Game"],
    image: "who-dares-wins.png",
    keywords: "who dares wins bidding list naming game show bank risk" },

  { title: "French Connect 4", url: "games/languages/french-connect4.html",
    blurb: "Puissance 4 — drop a counter by answering a French vocabulary question correctly.",
    kind: "Revision Game", levels: ["GCSE"], tags: ["Languages", "Revision Game", "Interactive"],
    image: "french-connect4.png",
    keywords: "french francais puissance 4 connect four vocabulary mfl languages modern foreign" },

  { title: "German Connect 4", url: "games/languages/german-connect4.html",
    blurb: "Vier Gewinnt — drop a counter by answering a German vocabulary question correctly.",
    kind: "Revision Game", levels: ["GCSE"], tags: ["Languages", "Revision Game", "Interactive"],
    image: "german-connect4.png",
    keywords: "german deutsch vier gewinnt connect four vocabulary mfl languages modern foreign" },

  { title: "Spanish Connect 4", url: "games/languages/spanish-connect4.html",
    blurb: "Conecta 4 — drop a counter by answering a Spanish vocabulary question correctly.",
    kind: "Revision Game", levels: ["GCSE"], tags: ["Languages", "Revision Game", "Interactive"],
    image: "spanish-connect4.png",
    keywords: "spanish espanol conecta 4 connect four vocabulary mfl languages modern foreign" }
];
