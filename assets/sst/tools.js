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
// topic:    the id of its shelf on the homepage, from SST_TOPICS below.
// featured: listed under the homepage search as a "Popular" link (order follows this list).

// Homepage shelves, in order. label is the short tab name, title the shelf heading.
// A tool whose topic isn't listed here lands on a "More tools" shelf at the end.
window.SST_TOPICS = [
  { id: "atoms",     label: "Atoms & bonding",  title: "Atoms, bonding & the periodic table" },
  { id: "reactions", label: "Reactions",        title: "Reactions, rates & required practicals" },
  { id: "organic",   label: "Organic & Earth",  title: "Organic chemistry, analysis & the atmosphere" },
  { id: "physics",   label: "Physics",          title: "Physics" },
  { id: "games",     label: "Revision games",   title: "Revision games" }
];

window.SST_TOOLS = [
  { title: "Time of Flight Tube", url: "visualisations/time-of-flight-mass-spectrometer/",
    topic: "atoms",
    blurb: "Fire ions down the drift tube, change the accelerating voltage and read the detector trace.",
    kind: "3D Model", levels: ["A-Level"], tags: ["AQA Chemistry", "Chemistry", "3D Model", "Interactive"],
    image: "tof-spectrometer.png", featured: true,
    keywords: "mass spec mass spectrometry tof time of flight isotopes relative atomic mass m/z ions drift tube 3.1.1.2" },

  { title: "Atomic Structure: Configurations, Orbitals & Ionisation", url: "visualisations/aqa-chemistry-hub/",
    topic: "atoms",
    blurb: "Fill the sub-levels by the rules, rotate the s and p orbitals, then read the jumps in ionisation energy.",
    kind: "Interactive", levels: ["A-Level"], tags: ["AQA Chemistry", "Chemistry", "3D Model", "Interactive"],
    image: "atomic-structure.png",
    keywords: "electron configuration electronic structure aufbau hund pauli exclusion orbital box diagram arrows sub-level sublevel energy level s p d 1s 2s 2p 3s 3p 3d 4s 4p overlap transition metal ion fe2+ fe3+ cu+ cu2+ cr3+ chromium copper anomaly exception noble gas shorthand argon core paired parallel spin shapes of orbitals spherical dumb-bell dumbbell nodal plane probability density electron cloud boundary surface 90% ionisation energy ionization successive first ie shell jump group period trend shielding nuclear charge evidence for sub-levels spin pairing repulsion kJ mol-1 3.1.1.2 3.1.1.3" },

  { title: "The Fractionating Column", url: "visualisations/fractional-distillation-column/",
    topic: "organic",
    blurb: "Orbit the column, follow a single tray and watch the fractions separate by boiling point.",
    kind: "3D Model", levels: ["GCSE"], tags: ["AQA Chemistry", "Chemistry", "3D Model", "Interactive"],
    image: "fractionating-column.png", featured: true,
    keywords: "fractional distillation crude oil fractions hydrocarbons alkanes petrol diesel bitumen boiling point trays 4.7.1.2" },

  { title: "Extraction of Aluminium (beta)", url: "visualisations/aluminium-extraction/",
    topic: "reactions",
    blurb: "Switch on the current, watch the ions move and the anodes burn away, then revise and self-mark exam questions.",
    kind: "Interactive", levels: ["GCSE"], tags: ["AQA Chemistry", "Chemistry", "Interactive"],
    image: "aluminium-extraction.png",
    keywords: "aluminium aluminum extraction electrolysis bauxite alumina aluminium oxide al2o3 cryolite melting point 950 2000 electrolyte molten ions free to move cathode anode negative positive electrode carbon graphite lining steel anodes burn away replaced carbon dioxide co2 half equations al3+ 3e- 2o2- o2 4e- oxidation reduction oil rig panic reactivity series more reactive than carbon cost electricity recycling worksheet printable pdf revision notes exam questions mark scheme higher tier 4.4.3.3 5.4.3.3" },

  { title: "Periodic Table Explorer", url: "visualisations/aqa-periodic-table/",
    topic: "atoms",
    blurb: "Spotlight groups and periods, overlay trends and open any element, then quiz the class in presenter mode.",
    kind: "Interactive", levels: ["GCSE", "A-Level"], tags: ["AQA Chemistry", "Chemistry", "Interactive"],
    image: "periodic-table.png",
    keywords: "periodic table data sheet elements relative atomic mass ar atomic number proton number group period alkali metals group 1 halogens group 7 noble gases group 0 transition metals metals non-metals electronic structure 2,8,1 electron configuration 1s2 subshell s p d f block chromium copper anomaly oxidation states electronegativity pauling first ionisation energy ionization atomic radius ionic radius period 3 oxides chlorides amphoteric group 2 history of the periodic table dalton newlands law of octaves mendeleev gaps predictions gallium eka-aluminium germanium eka-silicon tellurium iodine swap moseley atomic number isotopes presenter mode whiteboard quiz slides powerpoint key plain black and white exam data sheet dark mode 32 column wide long form lanthanides actinides f-block inline 4.1.2 4.1.3 3.1.1.2 3.2.1 3.2.2 3.2.3 3.2.4 3.2.5" },

  { title: "Development of the Model of the Atom", url: "visualisations/atomic-model-timeline/",
    topic: "atoms",
    blurb: "Move through time from the solid sphere to the nuclear model, rotating each one as you go.",
    kind: "3D Model", levels: ["GCSE"], tags: ["AQA Chemistry", "Chemistry", "3D Model", "Interactive"],
    image: "atom-through-time.png", featured: true,
    keywords: "atomic model timeline dalton thomson plum pudding rutherford alpha scattering bohr chadwick nucleus higher tier 4.1.1.3" },

  { title: "The Spectroscopy Detective", url: "visualisations/spectroscopy-detective/",
    topic: "organic",
    blurb: "Work case files of mystery molecules, logging IR, mass spec and NMR evidence to a final deduction.",
    kind: "Interactive", levels: ["A-Level"], tags: ["AQA Chemistry", "Chemistry", "Interactive"],
    image: "spectroscopy-detective.png",
    keywords: "spectroscopy organic analysis infrared ir mass spectrometry nmr proton carbon 13 fingerprint structure determination 3.3.6" },

  { title: "Chemical Bonding: Ionic, Covalent & Metallic", url: "visualisations/chemical-bonding/",
    topic: "atoms",
    blurb: "Watch electrons transfer and pair up, spin an ionic lattice, then push, heat and wire up a metal.",
    kind: "Interactive", levels: ["GCSE"], tags: ["AQA Chemistry", "Chemistry", "Interactive"],
    image: "chemical-bonding.png",
    keywords: "chemical bonding ionic bond covalent bond metallic bond dot and cross dot-and-cross diagram electron transfer shared pair lone pair non-bonding pair single bond double bond electrostatic attraction oppositely charged ions giant ionic lattice regular lattice sodium chloride nacl magnesium oxide mgo magnesium chloride mgcl2 na+ cl- mg2+ o2- hydrogen h2 oxygen o2 water h2o methane ch4 simple molecule intermolecular forces delocalised electrons delocalized sea of electrons positive ions malleable malleability ductile layers slide alloy alloys harder bronze steel copper iron tin carbon electrical conductivity thermal conductivity conduct heat electricity square brackets charge noble gas electronic structure full outer shell misconceptions examiner mark scheme 4.2.1.1 4.2.1.2 4.2.1.3 4.2.1.4 4.2.1.5 4.2.2.7 4.2.2.8 5.2.1.1 5.2.1.2 5.2.1.3 5.2.1.4 5.2.1.5" },

  { title: "Balancing Equations: Atoms & Molecules", url: "visualisations/balancing-equations/",
    topic: "atoms",
    blurb: "Copy and paste whole ball-and-stick molecules until the balance scale levels, then see why changing a subscript makes a different substance.",
    kind: "Interactive", levels: ["KS3", "GCSE"], tags: ["AQA Chemistry", "Chemistry", "Interactive"],
    image: "balancing-equations.png",
    keywords: "balancing equations balance symbol equations balanced chemical equation word equation symbol equation coefficient coefficients multiplier big number in front subscript subscripts small number formula formulae chemical formula counting atoms number of atoms brackets conservation of mass law of conservation of mass atoms rearranged mass of reactants equals mass of products relative formula mass mr ball and stick molecular model molecule models cpk particle diagram combustion of methane burning methane synthesis of water hydrogen oxygen haber process ammonia nitrogen photosynthesis glucose neutralisation sulfuric acid sodium hydroxide sodium sulfate hydrochloric acid magnesium oxide sodium and water iron chlorine propane ethanol calcium carbonate marble chips aluminium oxide hydrogen peroxide ozone carbon monoxide custom reaction creator balancing calculator seesaw scale diagnostic quiz misconception presenter mode whiteboard annotate worksheet printable exam questions mark scheme ks3 year 8 year 9 4.1.1.1 4.3.1.1 5.1.1.1 5.3.1.1 8462 8464 ballancing equasions balencing" },

  { title: "Shapes of Simple Molecules and Ions", url: "visualisations/shapes-of-simple-molecules/",
    topic: "atoms",
    blurb: "Orbit every AQA shape, switch the lone pairs on and off, then self-mark a four-mark explanation.",
    kind: "3D Model", levels: ["A-Level"], tags: ["AQA Chemistry", "Chemistry", "3D Model", "Interactive"],
    image: "shapes-of-molecules.png",
    keywords: "shapes of molecules vsepr bond angle lone pair bonding pair repulsion tetrahedral trigonal planar pyramidal octahedral bipyramidal linear non-linear bent square planar t-shaped 109.5 107 104.5 120 90 180 ammonia water methane bf3 becl2 pcl5 sf6 xef4 clf3 nh4+ pf6- 3.1.3.5" },

  { title: "Benzene: Structure & Delocalisation", url: "visualisations/aromatic-benzene-delocalisation/",
    topic: "organic",
    blurb: "Compare the Kekulé and delocalised models in 3D, then drag benzene down onto its real energy level.",
    kind: "3D Model", levels: ["A-Level"], tags: ["AQA Chemistry", "Chemistry", "3D Model", "Interactive"],
    image: "benzene.png",
    keywords: "aromatic chemistry benzene arene delocalisation delocalised kekule cyclohexa-1,3,5-triene resonance stabilisation energy 152 enthalpy of hydrogenation 120 208 360 cyclohexene cyclohexane x-ray diffraction bond length 140 pm 134 154 electrophilic substitution addition bromine water halogen carrier pi electrons p orbitals sideways overlap planar regular hexagon 120 degrees 3.3.10" },

  { title: "3D Molecule Builder & IUPAC Naming (beta)", url: "visualisations/molecule-builder-iupac/",
    topic: "organic",
    blurb: "Draw an organic molecule, read its IUPAC name and formula, then turn it round in 3D beside its mirror image.",
    kind: "Interactive", levels: ["GCSE", "A-Level"], tags: ["AQA Chemistry", "Chemistry", "3D Model", "Interactive"],
    image: "molecule-builder.png",
    keywords: "iupac nomenclature naming organic compounds molecule builder drawing editor displayed formula structural formula skeletal formula molecular formula relative molecular mass mr molar mass ball and stick model 3d homologous series general formula functional group alkane alkene alcohol carboxylic acid ester aldehyde ketone amine amide nitrile acyl chloride halogenoalkane haloalkane arene benzene phenol phenylamine longest chain locant prefix suffix stem methyl ethyl propyl branched isomer structural isomerism stereoisomerism optical isomers chiral centre chirality enantiomer mirror image non-superimposable asymmetric carbon lactic acid 2-hydroxypropanoic acid alanine e/z cis trans geometric isomerism but-2-ene vsepr bond angle 109.5 120 tetrahedral trigonal planar gcse a-level 4.7.1 4.7.2 4.7.3 3.3.1.1 3.3.1.2 3.3.1.3 3.3.7" },

  { title: "Organic Reaction Mechanisms", url: "visualisations/organic-reaction-mechanisms/",
    topic: "organic",
    blurb: "Step through every AQA curly-arrow mechanism, then place the arrows yourself against the mark scheme.",
    kind: "Interactive", levels: ["A-Level"], tags: ["AQA Chemistry", "Chemistry", "Interactive"],
    image: "reaction-mechanisms.png",
    keywords: "organic mechanisms curly arrows electron pair movement free radical substitution initiation propagation termination homolytic fission fishhook chlorination methane electrophilic addition alkene ethene propene hbr bromine br2 sulfuric acid carbocation markownikoff nucleophilic substitution halogenoalkane bromoethane hydroxide cyanide ammonia hydrolysis elimination ethanolic koh dehydration alcohol nucleophilic addition carbonyl aldehyde ketone ethanal propanone nabh4 hydride kcn hydroxynitrile racemic addition-elimination acyl chloride ethanoyl chloride amide ester electrophilic substitution benzene nitration nitronium friedel crafts acylation acylium halogen carrier heterolytic delta positive lone pair leaving group intermediate 3.3.2 3.3.3 3.3.4 3.3.5 3.3.7 3.3.10 3.3.11 3.3.12 3.3.13" },

  { title: "LabSketch (beta): Apparatus Diagram Drawer", url: "visualisations/labsketch-apparatus-drawer/",
    topic: "reactions",
    blurb: "Draw lab apparatus from a vector library, or load a pre-drawn required practical, then export it.",
    kind: "Interactive", levels: ["GCSE"], tags: ["AQA Chemistry", "Chemistry", "Physics", "Interactive"],
    image: "labsketch.png",
    keywords: "lab apparatus diagram drawer chemix required practical rp worksheet exam paper svg png export beaker conical flask burette titration electrolysis bunsen burner tripod gauze retort stand clamp gas syringe measuring cylinder thermometer chromatography distillation liebig condenser eureka displacement can ripple tank circuit ammeter voltmeter variable resistor i-v characteristics density making salts neutralisation temperature changes rates of reaction identifying ions water purification" },

  { title: "Rate of Reaction & Collision Theory", url: "visualisations/rate-of-reaction-simulator/",
    topic: "reactions",
    blurb: "Set temperature, concentration and surface area, watch the collisions and the graph respond, then see how a catalyst works through a high-jump analogy.",
    kind: "Interactive", levels: ["GCSE"], tags: ["AQA Chemistry", "Chemistry", "Interactive"],
    image: "rate-of-reaction.png",
    keywords: "rates of reaction collision theory activation energy catalyst catalysts how catalysts work alternative pathway lower activation energy high jump analogy reaction profile energy profile diagram exothermic endothermic concentration temperature surface area particles 4.6.1 4.6.1.4 4.5.1.3" },

  { title: "Dynamic Equilibrium Lab", url: "visualisations/dynamic-equilibrium-lab/",
    topic: "reactions",
    blurb: "Watch particles react both ways until the rates meet, change the conditions and see the system respond, then calculate Kc, Q and Kp from the chamber at A-level.",
    kind: "Interactive", levels: ["GCSE", "A-Level"], tags: ["AQA Chemistry", "Chemistry", "Interactive"],
    image: "dynamic-equilibrium-lab.png",
    keywords: "dynamic equilibrium reversible reactions le chatelier le chatelier's principle le chatlier position of equilibrium forward reverse rate equal rates closed system concentration temperature pressure catalyst haber process ammonia compromise yield exothermic endothermic kc kp equilibrium constant equilibria reaction quotient q ice table partial pressure mole fraction hydrogen iodide 4.6.2 4.6.2.1 4.6.2.2 4.6.2.3 4.6.2.4 4.6.2.5 4.6.2.6 4.6.2.7 4.10.4.1 3.1.6 3.1.10" },

  { title: "Evolution of the Atmosphere", url: "visualisations/atmosphere-evolution/",
    topic: "organic",
    blurb: "Scrub 4.6 billion years from the volcanoes of the first billion years to algae, plants and today, then practise the exam answers.",
    kind: "3D Model", levels: ["GCSE"], tags: ["AQA Chemistry", "Chemistry", "3D Model", "Interactive"],
    image: "atmosphere-evolution.png",
    keywords: "evolution of the earths atmosphere early atmosphere volcanoes volcanic activity carbon dioxide oxygen nitrogen water vapour condensed oceans dissolved carbonates precipitated sediments algae photosynthesis plants fossil fuels coal crude oil natural gas limestone sedimentary rock methane ammonia mars venus four fifths one fifth 80% 20% 200 million years 2.7 billion theory evidence 4.9.1 4.9.1.1 4.9.1.2 4.9.1.3 4.9.1.4 5.9.1 trilogy combined science worksheet mark scheme" },

  { title: "Titration Lab (beta)", url: "visualisations/titration-lab/",
    topic: "reactions",
    blurb: "Rinse, fill and read a burette, titrate to the endpoint and calculate the unknown from your own concordant titres, from GCSE neutralisation to manganate(VII).",
    kind: "Interactive", levels: ["GCSE", "A-Level"], tags: ["AQA Chemistry", "Chemistry", "Interactive"],
    image: "titration-lab.png",
    keywords: "titration titrations titrate virtual practical lab simulation required practical 2 rp2 required practical 1 rp1 required practical 9 rp9 burette pipette volumetric pipette pipette filler conical flask funnel white tile wash bottle meniscus reading the burette eye level parallax end point endpoint equivalence point rough titre concordant titres within 0.10 cm3 mean titre precision accuracy uncertainty percentage uncertainty percentage error neutralisation neutralization acid alkali strong acid strong alkali hydrochloric acid sulfuric acid sulphuric acid nitric acid sodium hydroxide potassium hydroxide indicator phenolphthalein methyl orange bromothymol blue universal indicator ph curve weak acid weak base ethanoic acid acetic acid ammonia sodium carbonate na2co3 standard solution primary standard volumetric flask make up to the mark weighing by difference moles concentration mol/dm3 mol dm-3 g/dm3 mole ratio stoichiometry redox titration potassium manganate(vii) potassium manganate 7 potassium permanganate kmno4 mno4- manganate self-indicating pale pink iron(ii) fe2+ iron tablets ethanedioate oxalate ethanedioic acid oxalic acid autocatalysis autocatalyst mn2+ warm 60 degrees acidify dilute sulfuric acid why not hydrochloric acid chloride oxidised mystery challenge worksheet mark scheme presenter mode 4.4.2.5 4.3.4 3.1.2.5 3.1.12.5 3.2.5.5 3.2.5.6 8462 7405" },

  { title: "Electrochemical Cell Builder (beta)", url: "visualisations/electrochemical-cells/",
    topic: "reactions",
    blurb: "Build a cell, predict which electrode is negative, then watch the electrons and ions move, from GCSE simple cells and electrolysis to A-level E°cell and Required practical 8.",
    kind: "Interactive", levels: ["GCSE", "A-Level"], tags: ["AQA Chemistry", "Chemistry", "Interactive"],
    image: "electrochemical-cells.png",
    keywords: "electrochemical cells electrochemistry chemical cells simple cell voltaic cell galvanic cell daniell cell zinc copper battery batteries cells in series voltage voltmeter electrodes electrolyte reactivity series more reactive metal negative electrode positive electrode rechargeable non-rechargeable alkaline battery fuel cell hydrogen fuel cell hydrogen oxygen water evaluate fuel cells half equations electrolysis molten aqueous lead bromide pbbr2 sodium chloride brine copper sulfate copper chloride potassium bromide sodium sulfate sulfuric acid inert electrodes graphite cathode anode oxidation reduction oil rig ions move products hydrogen chlorine oxygen bromine 4oh- discharge rules required practical 3 rp3 electrode potentials standard electrode potential e° e-cell ecell emf electromotive force electrochemical series standard hydrogen electrode she platinum 298 k 100 kpa 1.00 mol dm-3 standard conditions conventional representation cell notation cell diagram salt bridge potassium nitrate kno3 kcl silver chloride precipitate high resistance voltmeter predicting redox reactions feasible feasibility oxidising agent reducing agent iron(iii) iodide balancing electrons do not multiply e° required practical 8 rp8 measuring emf changing concentration le chatelier non-standard conditions worksheet mark scheme presenter mode 4.4.3 4.4.3.1 4.4.3.2 4.4.3.4 4.4.3.5 4.5.2.1 4.5.2.2 3.1.11 3.1.11.1 3.1.11.2 8462 7405" },

  { title: "Organic Synthesis Pathways (beta)", url: "visualisations/organic-synthesis/",
    topic: "organic",
    blurb: "Turn one organic molecule into another by choosing reagents and conditions, and find out why each step works or fails.",
    kind: "Interactive", levels: ["GCSE", "A-Level"], tags: ["AQA Chemistry", "Chemistry", "Interactive"],
    image: "organic-synthesis.png",
    keywords: "organic synthesis route pathway multi-step retrosynthesis reagents conditions functional group interconversion reaction map alkene alcohol aldehyde ketone carboxylic acid ester halogenoalkane haloalkane nitrile amine amide acyl chloride acid anhydride benzene nitrobenzene phenylamine aniline hydration fermentation cracking oxidation reduction acidified potassium dichromate distil reflux nabh4 lialh4 kcn hydroxynitrile nucleophilic substitution elimination electrophilic addition markownikoff major minor product esterification hydrolysis acylation friedel crafts nitration chain lengthening optical isomers racemic worksheet mark scheme presenter mode 4.7.1.4 4.7.2 3.3.2 3.3.3 3.3.4 3.3.5 3.3.8 3.3.9 3.3.10 3.3.11 3.3.14 8462 7405" },

  { title: "Measuring Gas in Reactions (beta)", url: "visualisations/measuring-gas-production/",
    topic: "reactions",
    blurb: "Run the gas syringe, mass-loss and over-water setups, watch the live graphs build, then find the rate from a tangent.",
    kind: "Interactive", levels: ["GCSE"], tags: ["AQA Chemistry", "Chemistry", "Interactive"],
    image: "measuring-gas.png",
    keywords: "measuring gas produced gas collection rates of reaction required practical rp5 rp11 gas syringe plunger volume of gas cm3 mass loss balance cotton wool marble chips calcium carbonate hydrochloric acid carbon dioxide co2 magnesium ribbon hydrogen h2 hydrogen peroxide manganese dioxide mno2 catalyst oxygen o2 downward displacement of water collecting gas over water upturned inverted measuring cylinder burette trough solubility soluble insoluble density mean rate cm3/s g/s tangent gradient rate at a time volume time graph mass time graph sources of error improvements presenter mode slides worksheet printable pdf exam questions mark scheme higher tier 4.6.1.1 5.6.1.1" },

  { title: "Waves: Ripple Tank & Stretched String", url: "visualisations/waves-required-practical/",
    topic: "physics",
    blurb: "Orbit the 3D apparatus, freeze the tank with a strobe, interfere two dippers and tune a string to resonance. AQA RP8 plus a BTEC addendum.",
    kind: "Interactive", levels: ["GCSE"], tags: ["AQA Physics", "Physics", "3D Model", "Interactive"],
    image: "waves-practical.png",
    keywords: "required practical 8 rp8 waves ripple tank water waves wavelength frequency wave speed v = f lambda stroboscope strobe dipper plane waves point source wavefront stretched string standing wave stationary wave vibration generator signal generator node antinode harmonic fundamental resonance tension pulley hanging masses mass per unit length metre rule apparatus set up diagram 3d lamp white screen projection two dippers two source interference superposition coherent coherence path difference phase difference constructive destructive maxima minima fringes btec applied science unit 1 c1 working with waves diffraction grating 4.6.1.2 4.6.1.3" },

  { title: "Radioactivity: Half-Life & Absorption", url: "visualisations/radioactivity/",
    topic: "physics",
    blurb: "Watch nuclei decay at random and read the half-life off the live graph, then block alpha, beta and gamma in front of a Geiger counter.",
    kind: "Interactive", levels: ["GCSE"], tags: ["AQA Physics", "Physics", "Interactive"],
    image: "radioactivity.png",
    keywords: "radioactivity radioactive decay nuclear radiation half life half-life halflife random decay unstable nuclei nucleus isotope activity becquerel bq count rate counts per second counts per minute cps cpm geiger muller geiger-muller gm tube geiger counter background radiation alpha particle beta particle gamma ray gamma rays helium nucleus high speed electron electromagnetic ionising ionizing power penetrating range in air absorption absorbers paper aluminium aluminum lead concrete skin nuclear equations mass number atomic number balancing decay equation neutron turns into proton carbon-14 c-14 carbon dating radon-222 radon iodine-131 iodine cobalt-60 cobalt contamination irradiation net decline ratio graph reading mystery source presenter mode whiteboard annotate pen highlighter worksheet printable exam questions mark scheme higher tier 4.4.2.1 4.4.2.2 4.4.2.3 4.4.2.4 6.4.2.1 6.4.2.2 6.4.2.3 6.4.2.4 8463 8464" },

  { title: "Mass vs Weight across the Solar System", url: "visualisations/mass-weight-solar-system/",
    topic: "physics",
    blurb: "Weigh anything from a cat to a school bus on eleven worlds, then watch a spring balance stretch and an astronaut jump.",
    kind: "Interactive", levels: ["KS3"], tags: ["Physics", "Interactive"],
    image: "mass-weight.png",
    keywords: "mass weight difference w = m x g w=mg weight equals mass times gravitational field strength g n/kg newtons per kilogram 9.8 10 n/kg kilograms kg newtons n force of gravity gravity gravitational pull solar system planets sun mercury venus earth moon mars jupiter saturn uranus neptune pluto dwarf planet surface gravity weigh on other planets weightless weightlessness astronaut space newtonmeter newton meter spring balance forcemeter bathroom scales jump height moon jump dropping hammer feather apollo calculator worked examples rearrange quiz presenter mode whiteboard ks3 physics forces year 7 year 8 year 9" },

  { title: "Science Retrieval Presenter", url: "games/science/retrieval-quiz.html",
    topic: "games",
    blurb: "Timed recall across biology, chemistry and physics, mixing in earlier topics and required practicals.",
    kind: "Revision Game", levels: ["GCSE"], tags: ["Biology", "Chemistry", "Physics", "Revision Game", "Interactive"],
    image: "retrieval-presenter.png", featured: true,
    keywords: "retrieval practice recall starter plenary do now flashcard spaced interleaving quiz required practical rp paper 1 paper 2 foundation higher tier combined separate question bank editor timer" },

  { title: "Interleaved Science Grid Challenge (beta)", url: "games/science/interleaved-grid.html",
    topic: "games",
    blurb: "Pick cards from a 4×4 or 5×5 grid where older units score more, then chase the +1 higher-tier bonus.",
    kind: "Revision Game", levels: ["GCSE"], tags: ["Biology", "Chemistry", "Physics", "Revision Game", "Interactive"],
    image: "interleaved-grid-science.png",
    keywords: "interleaving interleaved spaced retrieval practice grid challenge recency points last month last year ks3 foundations higher tier bonus team game starter plenary whiteboard aqa 8461 8462 8463 8464 trilogy combined science edexcel 1bi0 1ch0 1ph0 1sc0 cell biology organisation infection bioenergetics homeostasis inheritance ecology atomic structure bonding quantitative moles energy changes rates equilibrium organic analysis atmosphere resources electricity particle model radioactivity forces waves magnetism space balanced symbol equations calculations" },

  { title: "Science Jeopardy", url: "games/science/science-jeopardy.html",
    topic: "games",
    blurb: "Board-style quiz across six categories, from cell biology to waves, electricity and space.",
    kind: "Revision Game", levels: ["GCSE"], tags: ["Biology", "Chemistry", "Physics", "Revision Game", "Interactive"],
    image: "science-jeopardy.png", featured: true,
    keywords: "jeopardy board quiz categories points starter plenary retrieval team game" },

  { title: "Science Blockbusters", url: "games/science/science-blockbusters.html",
    topic: "games",
    blurb: "Hexagon board head-to-head: answer to claim tiles and build a path across the grid.",
    kind: "Revision Game", levels: ["KS3", "GCSE"], tags: ["Biology", "Chemistry", "Physics", "Revision Game", "Interactive"],
    image: "science-blockbusters.png",
    keywords: "blockbusters hexagons letters board team game retrieval head to head" },

  { title: "Tenable Science", url: "games/science/tenable-science.html",
    topic: "games",
    blurb: "Name the top ten. List-based recall rounds that reward breadth over speed.",
    kind: "Revision Game", levels: ["KS3", "GCSE"], tags: ["Biology", "Chemistry", "Physics", "Revision Game"],
    image: "tenable-science.png",
    keywords: "tenable top ten list naming recall retrieval whole class reactivity series" },

  { title: "Who Dares Wins: Science", url: "games/science/who-dares-wins-science.html",
    topic: "games",
    blurb: "Bid, dare and bank the winnings in a list-naming game show for the whole class.",
    kind: "Revision Game", levels: ["KS3", "GCSE"], tags: ["Biology", "Chemistry", "Physics", "Revision Game"],
    image: "who-dares-wins.png",
    keywords: "who dares wins bidding list naming game show bank risk" },

  { title: "Who Wants to Be a Science Millionaire? (beta)", url: "games/science/millionaire/",
    topic: "games",
    blurb: "Climb a fifteen-question prize ladder with 50:50, Ask the Audience and Phone a Friend, using only the topics your class has been taught.",
    kind: "Revision Game", levels: ["GCSE"], tags: ["Biology", "Chemistry", "Physics", "Revision Game", "Interactive"],
    image: "science-millionaire.png",
    keywords: "who wants to be a millionaire science millionaire quiz game show multiple choice lifelines 50:50 fifty fifty ask the audience phone a friend safety net prize ladder starter plenary revision whiteboard class aqa 8461 8462 8463 8464 trilogy combined science separate foundation higher edexcel pearson 1bi0 1ch0 1ph0 1sc0 cell biology organisation infection bioenergetics homeostasis inheritance ecology atomic structure bonding quantitative chemical changes energy rates organic analysis atmosphere resources electricity particle model radioactivity forces waves magnetism space physics" }
];
