// Builds assets/uclaisi-logo.pdf: the UCL / AISI logo from the welcome box as vector text in
// Menlo. Page 1 is the site's lilac on dark; page 2 is the brand purples on white.
// Run by make_images.sh (macOS only: it uses the system's own text renderer).
ObjC.import('AppKit');
ObjC.import('Quartz');

const ART = [
  " █████╗ ██╗███████╗██╗",
  "██╔══██╗██║██╔════╝██║",
  "███████║██║███████╗██║",
  "██╔══██║██║╚════██║██║",
  "██║  ██║██║███████║██║",
  "╚═╝  ╚═╝╚═╝╚══════╝╚═╝",
];
const ART_SIZE = 40, LABEL_SIZE = 34, PAD = 60;

function color(hex) {
  const n = parseInt(hex.slice(1), 16);
  return $.NSColor.colorWithSRGBRedGreenBlueAlpha(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, 1);
}

function centered(lineHeight, spacingAfter) {
  const p = $.NSMutableParagraphStyle.alloc.init;
  p.alignment = 1; // centre: this Mac numbers alignments 0 left, 1 centre, 2 right (the bridge constants are older)
  p.minimumLineHeight = lineHeight;
  p.maximumLineHeight = lineHeight;
  p.paragraphSpacing = spacingAfter;
  return p;
}

function page(bg, labelColor, artColor) {
  const label = "UCL\n";
  const art = ART.join("\n");
  const width = ART[0].length * ART_SIZE * 0.6021 + PAD * 2 + 40; // spare room so rows never wrap
  const view = $.NSTextView.alloc.initWithFrame($.NSMakeRect(0, 0, width, 1000));
  view.textContainerInset = $.NSMakeSize(PAD, PAD);
  view.textContainer.lineFragmentPadding = 0;
  view.drawsBackground = true;
  view.backgroundColor = color(bg);
  view.string = label + art;

  const ts = view.textStorage;
  const set = (name, value, start, length) => ts.addAttributeValueRange(name, value, $.NSMakeRange(start, length));
  // "U C L", spaced out like the label on the site
  set($.NSFontAttributeName, $.NSFont.fontWithNameSize("Menlo-Bold", LABEL_SIZE), 0, label.length);
  set($.NSForegroundColorAttributeName, color(labelColor), 0, label.length);
  set($.NSParagraphStyleAttributeName, centered(LABEL_SIZE * 1.2, ART_SIZE * 0.35), 0, label.length);
  set($.NSKernAttributeName, $.NSNumber.numberWithDouble(LABEL_SIZE * 0.6), 0, 2);
  // AISI block letters, rows close enough that the blocks join with no seams
  set($.NSFontAttributeName, $.NSFont.fontWithNameSize("Menlo-Regular", ART_SIZE), label.length, art.length);
  set($.NSForegroundColorAttributeName, color(artColor), label.length, art.length);
  set($.NSParagraphStyleAttributeName, centered(ART_SIZE * 0.97, 0), label.length, art.length);

  view.layoutManager.ensureLayoutForTextContainer(view.textContainer);
  const used = view.layoutManager.usedRectForTextContainer(view.textContainer);
  view.setFrameSize($.NSMakeSize(width, used.size.height + PAD * 2));
  return view.dataWithPDFInsideRect(view.bounds);
}

function run(argv) {
  const doc = $.PDFDocument.alloc.initWithData(page("#16121A", "#CBB0E0", "#B98FD6")); // as on the site
  const light = $.PDFDocument.alloc.initWithData(page("#FFFFFF", "#2B0640", "#500778")); // brand purples
  doc.insertPageAtIndex(light.pageAtIndex(0), 1);
  doc.writeToFile(argv[0]);
  return "pages: " + doc.pageCount;
}
