import jq from "node-jq";
import got from "got";
import stream from "stream";
import { promisify } from "util";
import fs from "fs";
import { file } from "tmp-promise";
import eol from "eol";
import progress from "progress-stream";

const allCardsUrl = await got("https://api.scryfall.com/bulk-data")
    .json()
    .then((data) => data.data.find((object) => object.type === "all_cards"))
    .then((object) => object.download_uri);

console.log(`Download from: ${allCardsUrl}`);

const pipeline = promisify(stream.pipeline);
const { path, cleanup } = await file({ postfix: ".json" });
console.log(path);

const str = progress({
    // length: 9999999,
    time: 1000 /* ms */,
});

str.on("progress", function (progress) {
    console.log(progress);

    /*
    {
        percentage: 9.05,
        transferred: 949624,
        length: 10485760,
        remaining: 9536136,
        eta: 42,
        runtime: 3,
        delta: 295396,
        speed: 949624
    }
    */
});

// streamでtmpにレスポンスを書き込む
await pipeline(got.stream(allCardsUrl), str, fs.createWriteStream(path));

const filter = `.[]
    | . as $card
    | select(.lang == "ja")
    | if .card_faces then .card_faces
    | map({id: $card.id, english: .name, japanese: .printed_name})
    | .[] else {id, english: .name, japanese: .printed_name} end`;

console.log("フィルタ開始");
const filteredDict = await jq.run(filter, path, {
    input: "file",
    output: "compact",
});
console.log("[]をつける");
const two = await jq.run("", filteredDict, {
    input: "string",
    slurp: true,
    output: "pretty",
});

console.log("writing");
// TODO 場所
fs.writeFileSync("./japanese.json", eol.lf(two));

console.log("cleanup temp");
await cleanup();
console.log("done!");
