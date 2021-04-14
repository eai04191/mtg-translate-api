import { VercelRequest, VercelResponse } from "@vercel/node";
import cards from "./cards/japanese.json";
import strings from "./strings/japanese.json";

// fucking typescript inference
type Cards = {
    id: string;
    japanese: string;
    english: string;
}[];

const index = (request: VercelRequest, response: VercelResponse) => {
    if (request.method !== "POST") {
        response.status(405).send(`Methods other than POST are not allowed`);
        return;
    }

    const { from, to, decklist } = request.body;
    if (
        typeof from !== "string" ||
        typeof to !== "string" ||
        typeof decklist !== "string"
    ) {
        response.status(400).send(`wrong format`);
        return;
    }

    const array = [];
    decklist.split("\n").forEach((line) => {
        // カード名ではない部分の変換
        if (strings.map((s) => s.english).includes(line)) {
            const translatedString = strings.find((s) => s.english === line)
                .japanese;
            array.push(translatedString);
            return;
        }

        console.log("line", line);

        // カード名の変換
        if (Number.isInteger(Number([...line][0]))) {
            // カード名の抽出
            const name = line
                .split(" ")
                .filter((e, i) => i !== 0)
                .join(" ");
            const amount = line
                .split(" ")
                .filter((e, i) => i === 0)
                .join(" ");

            // 検索
            const searchResult = (cards as Cards).find(
                (c) => c.english === name
            );
            if (searchResult) {
                array.push(`${amount} ${searchResult.japanese}`);
                return;
            }

            // 見つからなかったらそのまま返す
            console.warn("Not Found", name);
            array.push(line);
            return;
        }

        // その他の行はそのまま
        array.push(line);
    });
    const conveterd_decklist = array.join("\n");

    response.status(201).json({ decklist: conveterd_decklist });
};

export default index;
