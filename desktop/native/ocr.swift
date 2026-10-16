// Reads images (JPEG or PNG, base64, one per line on stdin) and prints one JSON
// line per image with the text Apple's Vision framework recognizes in it:
// [{"text","x","y","w","h"}], coordinates 0-1 from the top left. Runs on the
// Mac, offline. LoL Tracker uses it to read the augment cards on screen.
import Foundation
import ImageIO
import Vision

struct Line: Encodable {
  let text: String
  let x: Double
  let y: Double
  let w: Double
  let h: Double
}

func recognize(_ data: Data) -> [Line] {
  guard let source = CGImageSourceCreateWithData(data as CFData, nil),
    let image = CGImageSourceCreateImageAtIndex(source, 0, nil)
  else { return [] }
  let request = VNRecognizeTextRequest()
  request.recognitionLevel = .accurate
  request.usesLanguageCorrection = false
  request.automaticallyDetectsLanguage = true
  do {
    try VNImageRequestHandler(cgImage: image, options: [:]).perform([request])
  } catch {
    return []
  }
  return (request.results ?? []).compactMap { observation in
    guard let best = observation.topCandidates(1).first else { return nil }
    let box = observation.boundingBox
    return Line(
      text: best.string, x: Double(box.minX), y: Double(1 - box.maxY), w: Double(box.width), h: Double(box.height))
  }
}

let encoder = JSONEncoder()
while let line = readLine() {
  let lines = Data(base64Encoded: line).map(recognize) ?? []
  let json = (try? encoder.encode(lines)).flatMap { String(data: $0, encoding: .utf8) } ?? "[]"
  FileHandle.standardOutput.write(Data((json + "\n").utf8))
}
