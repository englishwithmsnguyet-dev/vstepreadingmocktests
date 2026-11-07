#!/usr/bin/env osascript -l JavaScript

ObjC.import("PDFKit");
ObjC.import("Foundation");
ObjC.import("Vision");
ObjC.import("AppKit");

function run(argv) {
    var rangesStr = argv[0]; // e.g. "41-54,74-87"
    var pdfPath = "/Users/nguyetpham/Desktop/WEBSITE/READING MOCK TESTS/10 ĐỀ READING VSTEP.pdf";
    var doc = $.PDFDocument.alloc.initWithURL($.NSURL.fileURLWithPath(pdfPath));
    var outDir = "/Users/nguyetpham/Desktop/WEBSITE/READING MOCK TESTS/ocr_layout";
    $.NSFileManager.defaultManager.createDirectoryAtPathWithIntermediateDirectoriesAttributesError(outDir, true, $({}), null);

    var parts = rangesStr.split(",");
    for (var r = 0; r < parts.length; r++) {
        var bounds = parts[r].split("-");
        var startP = parseInt(bounds[0]);
        var endP = parseInt(bounds[1]);
        for (var pNum = startP; pNum <= endP; pNum++) {
            var outFile = outDir + "/page_" + pNum + ".tsv";
            if ($.NSFileManager.defaultManager.fileExistsAtPath(outFile)) continue;
            var p = doc.pageAtIndex(pNum - 1);
            var rect = p.boundsForBox($.kPDFDisplayBoxMediaBox);
            var img = $.NSImage.alloc.initWithSize(rect.size);
            img.lockFocus;
            var ctx = $.NSGraphicsContext.currentContext.CGContext;
            p.drawWithBoxToContext($.kPDFDisplayBoxMediaBox, ctx);
            img.unlockFocus;

            var tiff = img.TIFFRepresentation;
            var req = $.VNRecognizeTextRequest.alloc.init;
            req.recognitionLevel = $.VNRequestTextRecognitionLevelAccurate;
            req.usesLanguageCorrection = true;
            req.recognitionLanguages = $(["en", "vi"]);
            var handler = $.VNImageRequestHandler.alloc.initWithDataOptions(tiff, $({}));
            handler.performRequestsError($([req]), null);

            var obs = req.results;
            var lines = [];
            for (var i = 0; i < obs.count; i++) {
                var o = obs.objectAtIndex(i);
                var b = o.boundingBox;
                var s = o.topCandidates(1).objectAtIndex(0).string.js;
                lines.push(b.origin.x.toFixed(4) + "\t" + b.origin.y.toFixed(4) + "\t" + b.size.width.toFixed(4) + "\t" + b.size.height.toFixed(4) + "\t" + s);
            }
            var nsStr = $(lines.join("\n"));
            nsStr.writeToFileAtomicallyEncodingError(outFile, true, $.NSUTF8StringEncoding, null);
        }
    }
    return "Done " + rangesStr;
}
