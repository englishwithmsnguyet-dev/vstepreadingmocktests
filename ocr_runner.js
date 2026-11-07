#!/usr/bin/env osascript -l JavaScript

ObjC.import("PDFKit");
ObjC.import("Foundation");
ObjC.import("Vision");
ObjC.import("AppKit");

function run(argv) {
    var startPage = parseInt(argv[0] || "1");
    var endPage = parseInt(argv[1] || "1");
    
    var pdfPath = "/Users/nguyetpham/Desktop/WEBSITE/READING MOCK TESTS/10 ĐỀ READING VSTEP.pdf";
    var cacheDir = "/Users/nguyetpham/Desktop/WEBSITE/READING MOCK TESTS/ocr_cache";
    
    var doc = $.PDFDocument.alloc.initWithURL($.NSURL.fileURLWithPath(pdfPath));
    var totalPages = doc.pageCount;
    
    var fileManager = $.NSFileManager.defaultManager;
    
    for (var pNum = startPage; pNum <= endPage; pNum++) {
        if (pNum < 1 || pNum > totalPages) continue;
        
        var outFile = cacheDir + "/page_" + pNum + ".txt";
        if (fileManager.fileExistsAtPath(outFile)) {
            // Already cached
            continue;
        }
        
        var pageIndex = pNum - 1;
        var p = doc.pageAtIndex(pageIndex);
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
        req.recognitionLanguages = $(["vi", "en"]);
        
        var handler = $.VNImageRequestHandler.alloc.initWithDataOptions(tiff, $({}));
        handler.performRequestsError($([req]), null);
        
        var obs = req.results;
        var count = obs.count;
        var lines = [];
        for (var i = 0; i < count; i++) {
            lines.push(obs.objectAtIndex(i).topCandidates(1).objectAtIndex(0).string.js);
        }
        var fullText = lines.join("\n");
        var nsStr = $(fullText);
        nsStr.writeToFileAtomicallyEncodingError(outFile, true, $.NSUTF8StringEncoding, null);
        console.log("Cached page " + pNum + " (" + count + " lines)");
    }
}
