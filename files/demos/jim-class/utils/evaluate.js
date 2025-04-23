import { getConsolidatedSize } from "./dataset.js";
import { buildSemanticGraph } from "./graph.js";
import { calculateJSD } from "./utils.js";
/** Evaluate all codebooks based on the network structure. */
export const evaluateCodebooks = (dataset, parameters) => {
    const results = {};
    const observations = [[]];
    // Prepare for the results
    const codebooks = dataset.codebooks;
    const names = dataset.names;
    for (let i = 1; i < codebooks.length; i++) {
        results[names[i]] = { coverage: 0, density: 0, novelty: 0, divergence: 0 };
        observations.push([]);
    }
    // Calculate weights per node
    const graph = buildSemanticGraph(dataset, parameters);
    const nodeWeights = new Map();
    let totalWeight = 0;
    for (const node of graph.nodes) {
        const weight = node.totalWeight / (dataset.totalWeight ?? NaN);
        observations[0].push(weight);
        nodeWeights.set(node.id, weight);
        totalWeight += weight;
    }
    // The expectations are made based on (consolidate codes in each codebook) / (codes in the baseline)
    const consolidated = codebooks.map((codebook, i) => {
        if (i === 0) {
            return Object.keys(codebooks[0]).length;
        }
        return getConsolidatedSize(codebooks[0], codebook);
    });
    // Check if each node is covered by the codebooks
    let totalNovelty = 0;
    for (const node of graph.nodes) {
        const weight = nodeWeights.get(node.id) ?? NaN;
        // Check novelty
        if (node.novel) {
            totalNovelty += weight;
        }
        // Calculate on each codebook
        for (let i = 1; i < codebooks.length; i++) {
            const result = results[names[i]];
            const observed = node.weights[i];
            result.coverage += weight * observed;
            result.novelty += weight * observed * (node.novel ? 1 : 0);
            observations[i].push(observed);
        }
    }
    // Finalize the results
    for (let i = 1; i < codebooks.length; i++) {
        const result = results[names[i]];
        result.coverage = result.coverage / totalWeight;
        result.density = consolidated[i] / consolidated[0] / result.coverage;
        result.novelty = result.novelty / totalNovelty;
        result.divergence = Math.sqrt(calculateJSD(observations[0], observations[i]));
        result.count = Object.keys(codebooks[i]).length;
        result.consolidated = consolidated[i];
    }
    return results;
};
/** Evaluate all users based on the network structure. */
export const evaluateUsers = (dataset, parameters) => {
    const results = {};
    const observations = [[]];
    // Prepare for the results
    const users = Array.from(dataset.uidToNicknames?.keys() ?? []);
    users.unshift("# Everyone");
    for (let i = 1; i < users.length; i++) {
        results[users[i]] = { coverage: 0, novelty: 0, divergence: 0, count: 0 };
        observations.push([]);
    }
    // Prepare for the examples
    const examples = new Map();
    Object.values(dataset.source.data)
        .flatMap((chunk) => Object.entries(chunk))
        .flatMap(([, value]) => value.items)
        .forEach((item) => {
        // TODO: Support subchunks
        if (!("uid" in item)) {
            return;
        }
        examples.set(item.id, users.indexOf(item.uid));
        results[item.uid].count += 1;
    });
    // Calculate weights per user
    const weights = new Array(users.length).fill(1);
    weights[0] = 0;
    // Calculate weights per node
    const graph = buildSemanticGraph(dataset, parameters, users.length, (code) => {
        const owners = new Set();
        owners.add(0);
        for (let example of code.examples ?? []) {
            example = example.split("|||")[0];
            if (examples.has(example)) {
                const user = examples.get(example) ?? NaN;
                if (!owners.has(user)) {
                    owners.add(examples.get(example) ?? NaN);
                }
            }
        }
        return owners;
    }, weights);
    const nodeWeights = new Map();
    let totalWeight = 0;
    for (const node of graph.nodes) {
        const weight = node.totalWeight / (users.length - 1);
        observations[0].push(weight);
        nodeWeights.set(node.id, weight);
        totalWeight += weight;
    }
    // Check if each node is covered by the codebooks
    let totalNovelty = 0;
    for (const node of graph.nodes) {
        const weight = nodeWeights.get(node.id) ?? NaN;
        // Check novelty
        if (node.novel) {
            totalNovelty += weight;
        }
        // Calculate on each user
        for (let i = 1; i < users.length; i++) {
            const result = results[users[i]];
            const observed = node.weights[i];
            result.coverage += weight * observed;
            result.novelty += weight * observed * (node.novel ? 1 : 0);
            observations[i].push(observed);
        }
    }
    // Finalize the results
    for (let i = 1; i < users.length; i++) {
        const result = results[users[i]];
        result.coverage = result.coverage / totalWeight;
        result.novelty = result.novelty / totalNovelty;
        result.divergence = Math.sqrt(calculateJSD(observations[0], observations[i]));
    }
    return results;
};
/** Evaluate all codebooks per cluster, based on the network structure. */
export const evaluatePerCluster = (dataset, graph, _parameters) => {
    const results = [];
    // Prepare for the results
    const codebooks = dataset.codebooks;
    let totalCoverages = dataset.names.map(() => 0);
    // Calculate weights per cluster
    for (const cluster of graph.components ?? []) {
        let totalWeight = 0;
        let coverages = dataset.names.map(() => 0);
        // Check if each node is covered by the codebooks
        for (const node of cluster.nodes) {
            const weight = node.totalWeight / (dataset.totalWeight ?? NaN);
            totalWeight += weight;
            // Calculate on each codebook
            for (let i = 0; i < codebooks.length; i++) {
                const observed = node.weights[i];
                coverages[i] += weight * observed;
                totalCoverages[i] += weight * observed;
            }
        }
        coverages = coverages.map((coverage) => coverage / totalWeight);
        // Put it back to the results
        results.push({ component: cluster, coverages: coverages.slice(1), differences: [] });
    }
    // Calculate the total coverage and relative difference
    totalCoverages = totalCoverages.map((Coverage) => Coverage / totalCoverages[0]);
    for (const result of results) {
        result.differences = result.coverages.map((coverage, i) => coverage / totalCoverages[i + 1] - 1);
    }
    return results;
};
