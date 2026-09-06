# LabSketch (beta) — apparatus diagram drawer

> **Beta.** Usable, and the required practicals are all there, but it is
> still being worked on — expect rough edges and changes.

A free, open alternative to Chemix, aimed squarely at AQA GCSE. Place apparatus
from a vector library, or load a whole required practical in one click, then
export a high-resolution PNG or a true SVG for a worksheet, an exam paper or a
slide. One `index.html`, no build step — open it and it runs.

Everything is drawn as a single dark ink stroke on white, the way a printed
exam diagram is, so it survives a photocopier and drops onto a slide without a
background to knock out.

## The templates

Thirteen one-click setups covering the AQA GCSE Chemistry required practicals and
the three Physics practicals whose apparatus is worth drawing.

| Template | What it builds |
| --- | --- |
| Chem RP1 · Making a soluble salt | Three stages side by side: beaker on tripod and gauze over a Bunsen, filter funnel over a conical flask, evaporating basin back over the heat |
| Chem RP2 · Neutralisation and titration | Burette clamped to a retort stand over a conical flask on a white tile, indicator colour set from the inspector |
| Chem RP3 · Electrolysis | Two carbon electrodes in the electrolyte, wired to a d.c. supply, inverted tubes collecting the gases |
| Chem RP4 · Temperature changes | Polystyrene cup inside a glass beaker, lid, thermometer and stirrer |
| Chem RP5a · Disappearing cross | Conical flask on a printed cross, with a stopwatch |
| Chem RP5b · Gas volume by syringe | Bunged flask, delivery tube, clamped gas syringe |
| Chem RP5c · Gas over water | Inverted measuring cylinder in a water trough, delivery tube arching over the rim |
| Chem RP6 · Chromatography | Strip hung from a rod, pencil baseline above the solvent, spots separated up the paper |
| Chem RP7 · Identifying ions | Rack of tubes showing the hydroxide precipitates, plus a nichrome loop in a roaring flame |
| Chem RP8 · Water purification | Heated round-bottom flask, thermometer at the neck, Liebig condenser sloping to the receiver |

| Phys · Density of a solid | Displacement can over a measuring cylinder, with the balance |
| Phys · I–V characteristics | Battery, switch, variable resistor and ammeter in series, voltmeter in parallel |
| Phys · Ripple tank | Vibrating bar in the tank, lamp above, crests shadowed onto the screen |

A template is not special-cased anywhere in the engine. It is a plain list of
placed items — exactly what a teacher could have dragged out by hand — which is
what makes every part of one editable after it loads. Loading one takes no
confirmation, because it is a single undo away.

Every template stands on the same bench line at `y = 700`, so apparatus taken
from two different templates onto one canvas still sits on the same bench.

The Liebig condenser is drawn the way it appears in a textbook: a capsule
jacket sealed onto the inner tube at both ends, the tube running straight
through and out either side, and both water arms hanging under the jacket. The
arms sit perpendicular to the jacket, so on a sloping condenser they lean with
it, which is what glassware fixed to the jacket actually does.

### Captions

Captions are not placed by eye. The apparatus and the text of a template are
rasterised separately and compared pixel by pixel, and every one of the
thirteen comes back with zero overlapping ink. Bounding boxes are not enough on
their own — a curved delivery tube has an enormous box that its path never
fills — so the box test only narrows the search and the pixel test decides.
Leaders start at a caption's edge rather than underneath it.

One chemistry detail worth recording: on the distillation template the cooling
water enters at the **lower** end of the Liebig condenser and leaves at the
top. A condenser is run countercurrent, and labelling the arms the other way
round is an easy slip to make in a hand-built diagram.

## How a piece of apparatus is described

Each of the fifty-odd pieces is one registry entry:

```js
D('conical', {
  name:'Conical flask', cat:'glass', w:130, h:158,
  props:{ liquid:0.35, fill:'#eaf2fb', opacity:1 },
  schema:['liquid','fill','opacity'],
  lz:[48,146],
  anchors:[{ id:'neck', kind:'neck', x:65, y:8 }],
  interior:() => <path d="M55,10 L55,48 …Z" />,
  draw:() => <>{P('M52,8 L52,47 …')}</>
});
```

`schema` is the list of properties the inspector offers, so adding a new piece
never means touching the inspector. `anchors` are the points it snaps by.
`interior` and `lz` are what a vessel adds: the clip shape of its fillable
space, and the top and bottom of that space.

## Liquid that stays level

The requirement that makes this more than a clip-art palette: tilt a flask and
the liquid surface must stay horizontal. It does, and not by approximation.

The liquid is one very large rectangle drawn inside a group counter-rotated by
the item's own rotation, clipped to the vessel interior, with its top edge
placed at the point the fill level maps to:

```js
const yl = ly1 - (ly1 - ly0) * liquid;          // fill level in local space
const yp = cy + Math.cos(rot) * (yl - cy);      // that point, counter-rotated
```

Rotate the group by `-rot` inside a group rotated by `rot` and the two cancel,
so the rectangle is axis-aligned in the page while the glass turns. A flask on
its side shows a horizontal band across what is now the bottom of it.

## Tubing and wire: routed paths

A delivery tube is not a line between two points. It is a path of **nodes**,
and each node carries a tangent handle you swing about it to shape the run:

```js
// a node is [x, y, hx, hy] - a point, and the handle that leaves it
[[0, 0, 54, -58], [200, -60, 77, 18]]
```

The handle arriving at a node is that same handle mirrored, so every node is
smooth and there is only one thing to grab per node — the amber diamond on its
leash. Swinging it bends the curve about the node, which stays exactly where it
is. Shift holds the handle's reach and turns it in 5° steps, so you can aim a
run without changing how hard it bends. The ⊕ on each span adds a node on the
curve and hands the drag straight to it; double-clicking an interior node drops
it again.

A tube that has never been shaped by hand has no `pts`, and its nodes are
derived from the older two-point bow instead. That conversion is exact — a
quadratic is the cubic whose controls sit two thirds of the way out to the
quadratic's own — so every template built before handles existed still renders
to the same pixels. Measured deviation across the templates' curves: 6 × 10⁻¹⁴
of a pixel.

### Ends that stay connected

Dragging an end node near a port pulls it exactly onto it and records **which
item and which anchor it took**:

```js
props.bind = { a: { id:'i34x', anchor:'port' }, b: { id:'i51z', anchor:'nozzle' } }
```

`reconnect()` then puts every bound end back on its anchor after anything
moves. That is the difference between a connection and two things that merely
finish up near each other: drag the bung away and the tube's start goes with
it, the other end stays on the syringe, and the run stretches between the two.
A connected end is drawn filled, so it is obvious which ends are attached and
which are only close. The inspector names both ends and can detach either.

Which ports an end will take is `endMates` on the piece — `tube`, `port`,
`mouth`, `neck` and `drip` for tubing, `terminal` for wire. It is deliberately
separate from `MATES`, which governs whole-item snapping: a tube end should
latch onto a flask mouth, but a bung being dragged past one should not. Route
items are skipped as targets, so two tubes cannot bind into a ring that has
nowhere to resolve from.

Templates arrive already wired. `autoBind` runs on load and takes any end
sitting on a port, which connects all eleven wires of the I–V circuit, both
electrolysis leads and all three delivery tubes without any of that being
written into the templates by hand.

## Apparatus that stays together

The same idea one level up. A bung dropped into a neck, a clamp clipped to a
stand, gauze seated on a tripod, a beaker standing on that gauze — each records
the host it took and which pair of anchors met, and `remount` keeps that pair
coincident afterwards. Drag the heatproof mat in RP1 and the tripod, its gauze
and the beaker on top all travel with it; drag the flask in RP5b and its bung
goes too, which in turn drags the end of the tube clipped into the bung while
the far end stays on the gas syringe.

Mounts resolve depth first, so a burette on a clamp on a stand all arrives in
the right place in one pass, and a mount that would close a loop is simply not
followed.

### Plugs and sockets

`mates` alone cannot give a mount its direction — neck meets neck, post meets
post — so without more, every pair would mount both ways round and a stand
would end up hanging off its own clamp. That is exactly what the first cut did.

So an anchor is a **plug** or a **socket**, decided by its name, and plugs go
into sockets and never the reverse:

| | Anchors |
| --- | --- |
| Plugs | `base` `seat` `boss` `grip` `grip2` `hang` `stem` `tip` `spout` `bulb` |
| Sockets | everything else — a flask's `neck`, a stand's `post`, a clamp's `jaw`, a mat's `top`, a balance's `pan` |

Two pieces whose `base` anchors happen to meet are both just standing on the
bench, and neither is mounted to the other. `heat` is left out of mounting
altogether for the same reason: a Bunsen under a tripod is beside it, not part
of it. Routed items never take or give a mount, because they already have
`bind`.

Templates arrive assembled: `autoMount` runs on load and takes any anchor left
sitting on a mating one, which is what produces the four-deep beaker → gauze →
tripod → mat chain in RP1 without a word of it being written into the template.

The inspector names what a piece is attached to and can let go of it; so can
dragging it clear, or typing a position by hand. What a mount does **not** do
is rotate: a child follows its host's position, not its angle.

## Smart snapping

Anchors carry a `kind`, and `MATES` says which kinds pair: a bung seats in a
neck, a clamp boss clips to a stand rod, a delivery tube plugs into a bung
port, a wire clips onto a terminal, gauze seats on a tripod. While an item is
being dragged, every anchor it carries is measured against every mating anchor
on the canvas, and the nearest pair inside 26 units pulls the item into place.
The snap point is ringed in amber as it takes.

Grid snapping is the fallback, on a 10-unit grid, and only when no anchor is in
range.

## Automatic chemical formatting

Label text is stored raw and formatted at draw time, so the inspector still
shows `CuSO4(aq)` while the canvas shows CuSO₄(aq).

| Typed | Drawn | Rule |
| --- | --- | --- |
| `CuSO4(aq)` | CuSO₄(aq) | a digit after a letter or `)` drops |
| `Cu2+`, `SO42-` | Cu²⁺, SO₄²⁻ | a digit run followed by `+` or `−` rises |
| `SO4^2-` | SO₄²⁻ | `^` forces a superscript |
| `25 cm3`, `mol/dm3` | 25 cm³, mol/dm³ | the unit exception: cm, dm, mm and m go up |
| `OH-`, `Na+` | OH⁻, Na⁺ | a trailing sign after a letter rises |
| `->`, `<->` | →, ⇌ | arrows |

The rise-versus-drop distinction matters: a subscripted charge is wrong, and
`cm₃` in a label undermines the diagram it sits on. Auto-formatting can be
switched off per label for the rare caption that needs a literal digit.

## Export

The canvas already holds a complete, self-contained vector drawing, so the
export is a clone of the drawing layer sized to its own bounds — cropped to the
apparatus, with no whitespace to trim afterwards. PNG is rasterised from that
same SVG at 2×, 3× or 4×, so the two exports cannot drift apart. Background is
white or transparent, and a drawing saves and reloads as JSON.

Note that export bounds come from `worldBounds()`, computed from the items,
never from `getBBox()` on the group: the liquid rectangles are 1800 units square
before clipping, and `getBBox` ignores clip paths.

## What it loads from the network

React 18.3.1, ReactDOM, Babel standalone, the Tailwind Play CDN, Lucide, and
three Google Fonts families. Babel compiles the JSX in the browser, which is
what keeps this a single file with no build step.

That is the same arrangement as `organic-reaction-mechanisms/`, and unlike
`shapes-of-simple-molecules/`, which vendors everything so it survives school
filters that block CDNs. If this tool needs the same treatment, the move is to
copy that folder's `lib/` and `fonts/`, precompile the JSX to `app.js`, and drop
the Babel tag. Icons already fail soft: if Lucide does not load, every toolbar
control still reads from its text label, because none of them is icon-only.
