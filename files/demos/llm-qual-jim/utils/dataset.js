/** Find a consolidated code by name. */
export const findConsolidatedCode = (consolidated, name) => Object.values(consolidated).find((Code) => Code.label === name || Code.alternatives?.includes(name));
/** Get the size of the consolidated codebook. */
export const getConsolidatedSize = (baseline, codebook) => new Set(Object.keys(codebook)
    .map((code) => findConsolidatedCode(baseline, code)?.label)
    .map((Code) => Code)).size;
/** Extract examples from a code. */
export const extractExamples = (examples) => {
    const results = new Map();
    const scores = new Map();
    // Extract the examples
    for (const example of examples) {
        const index = example.indexOf("|||");
        if (index !== -1) {
            const quote = example.substring(index + 3);
            const id = example.substring(0, index);
            if (!results.has(quote)) {
                results.set(quote, []);
            }
            results.get(quote)?.push(id);
        }
        else {
            if (!results.has(example)) {
                results.set(example, []);
            }
            results.get(example)?.push("");
        }
    }
    // Calculate the score
    for (const [quote, ids] of results) {
        scores.set(quote, quote.length * ids.length);
    }
    // Sort by the score
    const newResults = new Map();
    Array.from(scores.keys())
        .sort((a, b) => (scores.get(b) ?? NaN) - (scores.get(a) ?? NaN))
        .forEach((key) => {
        newResults.set(key, results.get(key) ?? []);
    });
    return newResults;
};
/** Find the original codes from an owner. */
export const findOriginalCodes = (codebook, source, _owner, example) => {
    let codes = Object.values(codebook);
    codes = codes.filter((code) => source.label === code.label || source.alternatives?.includes(code.label));
    if (example) {
        codes = codes.filter((code) => code.examples
            ? code.examples.includes(example) ||
                code.examples.some((cur) => cur.startsWith(`${example}|||`))
            : false);
    }
    return codes;
};
/** Find the original sources of an example from an owner. */
export const findExampleSources = (codebook, source, example, owner) => {
    const codes = findOriginalCodes(codebook, source, owner);
    const softMatch = `|||${example}`;
    return codes.filter((code) => code.examples?.findIndex((cur) => cur === example || cur.endsWith(softMatch)) !== -1);
};
/** Get the chunks from the sources. */
export const getChunks = (source) => Object.values(source).flatMap((source) => Object.values(source));
/** Get the items from the sources. */
export const getItems = (sources) => getChunks(sources)
    .flatMap((chunk) => chunk.items)
    .filter((item) => !("items" in item));
/** Get the items from a source. */
export const getItemsFromDataset = (Sources) => Object.values(Sources)
    .flatMap((chunk) => chunk.items)
    .filter((item) => !("items" in item));
