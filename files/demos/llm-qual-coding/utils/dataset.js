/** FindConsolidatedCode: Find a consolidated code by name. */
export function FindConsolidatedCode(Consolidated, Name) {
    return Object.values(Consolidated).find((Code) => Code.Label == Name || Code.Alternatives?.includes(Name));
}
/** GetConsolidatedSize: Get the size of the consolidated codebook. */
export function GetConsolidatedSize(Baseline, Codebook) {
    return new Set(Object.keys(Codebook)
        .map((Code) => FindConsolidatedCode(Baseline, Code)?.Label)
        .map((Code) => Code)).size;
}
/** ExtractExamples: Extract examples from a code. */
export function ExtractExamples(Examples) {
    var Results = new Map();
    var Scores = new Map();
    // Extract the examples
    for (var Example of Examples) {
        var Index = Example.indexOf("|||");
        if (Index != -1) {
            var Quote = Example.substring(Index + 3);
            var ID = Example.substring(0, Index);
            if (!Results.has(Quote))
                Results.set(Quote, []);
            Results.get(Quote).push(ID);
        }
        else {
            if (!Results.has(Example))
                Results.set(Example, []);
            Results.get(Example).push("");
        }
    }
    // Calculate the score
    for (var [Quote, IDs] of Results) {
        Scores.set(Quote, Quote.length * IDs.length);
    }
    // Sort by the score
    var NewResults = new Map();
    Array.from(Scores.keys())
        .sort((A, B) => Scores.get(B) - Scores.get(A))
        .forEach((Key) => {
        NewResults.set(Key, Results.get(Key));
    });
    return NewResults;
}
/** FindOriginalCodes: Find the original codes from an owner. */
export function FindOriginalCodes(Codebook, Source, Owner, Example) {
    var Codes = Object.values(Codebook);
    Codes = Codes.filter((Code) => Source.Label == Code.Label || Source.Alternatives?.includes(Code.Label));
    if (Example)
        Codes = Codes.filter((Code) => Code.Examples?.includes(Example) || Code.Examples?.some((Current) => Current.startsWith(`${Example}|||`)));
    return Codes;
}
/** FindExampleSources: Find the original sources of an example from an owner. */
export function FindExampleSources(Codebook, Source, Example, Owner) {
    var Codes = FindOriginalCodes(Codebook, Source, Owner);
    var SoftMatch = `|||${Example}`;
    return Codes.filter((Code) => Code.Examples?.findIndex((Current) => Current == Example || Current.endsWith(SoftMatch)) != -1);
}
/** GetChunks: Get the chunks from the sources. */
export function GetChunks(Sources) {
    return Object.values(Sources).flatMap((Source) => Object.values(Source));
}
/** GetItems: Get the items from the sources. */
export function GetItems(Sources) {
    return GetChunks(Sources).flatMap((Chunk) => Chunk.AllItems ?? []);
}
/** GetItems: Get the items from a source. */
export function GetItemsFromDataset(Sources) {
    return Object.values(Sources).flatMap((Chunk) => Chunk.AllItems ?? []);
}
