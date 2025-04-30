

import { inverseLerp, Parameters } from "./utils.js";
/** Find the indices of the minimum k elements in an array. */
const findMinimumIndexes = (arr, k) => {
    // Create an array of indices [0, 1, 2, ..., arr.length - 1].
    const indices = arr.map((_value, index) => index);
    // Sort the indices array based on the values at these indices in the original array.
    indices.sort((a, b) => arr[a] - arr[b]);
    // Return the first k indices.
    return indices.slice(0, k);
};
/** Build a semantic code graph from the dataset. */
export const buildSemanticGraph = (dataset, parameter = new Parameters(), allOwners = dataset.codebooks.length, ownerGetter = (code) => new Set(code.owners), ownerWeights = dataset.weights ?? []) => {
    const nodes = dataset.codes.map((code, index) => ({
        type: "Code",
        id: index.toString(),
        index,
        data: code,
        links: [],
        owners: ownerGetter(code),
        nearOwners: ownerGetter(code),
        weights: new Array(allOwners).fill(0),
        totalWeight: 0,
        neighbors: 0,
        size: Math.sqrt(code.examples?.length ?? 1),
        x: 0,
        y: 0,
    })); // x: Code.Position![0], y: Code.Position![1]
    const links = new Map();
    let maxDist = 0;
    let minDist = Number.MAX_VALUE;
    const getWeight = (id) => ownerWeights[id];
    // Create the links
    for (let i = 0; i < nodes.length; i++) {
        const source = nodes[i];
        // Find potential links
        const potentials = new Set();
        findMinimumIndexes(dataset.distances[i], parameter.closestNeighbors + 1).forEach((idx) => potentials.add(idx));
        for (let j = i + 1; j < nodes.length; j++) {
            if (dataset.distances[i][j] <= parameter.linkMinDist) {
                potentials.add(j);
            }
        }
        // Create the links
        for (const j of potentials) {
            if (i === j) {
                continue;
            }
            const target = nodes[j];
            const linkID = [source.id, target.id].sort().join("-");
            const distance = dataset.distances[i][j];
            if (distance > parameter.linkMaxDist) {
                continue;
            }
            if (!links.has(linkID)) {
                const link = {
                    source,
                    target,
                    distance,
                    visualizeDistance: inverseLerp(parameter.linkMinDist, parameter.linkMaxDist, distance),
                };
                link.weight = (1 - (link.visualizeDistance ?? NaN)) ** 2;
                link.visualizeWeight = link.weight;
                source.links.push(link);
                target.links.push(link);
                links.set(linkID, link);
                if (distance <= parameter.linkMinDist) {
                    source.owners.forEach((Owner) => {
                        target.nearOwners.add(Owner);
                        target.weights[Owner] += 1;
                    });
                    target.owners.forEach((Owner) => {
                        source.nearOwners.add(Owner);
                        source.weights[Owner] += 1;
                    });
                    source.neighbors++;
                    target.neighbors++;
                }
            }
            maxDist = Math.max(maxDist, distance);
            minDist = Math.min(minDist, distance);
        }
    }
    // Calculate the weights
    for (const source of nodes) {
        for (let owner = 0; owner < allOwners; owner++) {
            source.weights[owner] = Math.min(Math.max(source.weights[owner] / Math.max(source.neighbors, 1), 0), 1);
        }
        let realOwners = 0;
        for (const owner of source.owners) {
            if (getWeight(owner) > 0) {
                realOwners++;
            }
            source.weights[owner] = 1;
        }
        source.novel = realOwners === 1;
        source.totalWeight = source.weights.reduce((A, B, I) => (I === 0 ? A : A + B * getWeight(I)), 0);
    }
    // Store it
    const graph = {
        nodes,
        links: Array.from(links.values()),
        maxDist,
        minDist,
    };
    // Identify the components
    graph.components = findCommunities(graph.nodes, graph.links, (node) => {
        // Only to solve ties
        return Math.sqrt(node.data.examples?.length ?? 0) * 0.001;
    });
    // Look at every link - and if the source and target are in different components, reduce the weight
    // Thus, we will have a more close spatial arrangement of the components
    const effectiveNodes = Math.max(100, graph.nodes.length);
    graph.links.forEach((link) => {
        if (link.source.component === link.target.component) {
            link.visualizeWeight = link.visualizeWeight ?? NaN;
        }
        else {
            if (link.source.links.length <= 1 || link.target.links.length <= 1) {
                return;
            }
            if (link.source.component !== undefined && link.target.component !== undefined) {
                link.visualizeDistance =
                    (link.visualizeDistance ?? NaN) * Math.sqrt(effectiveNodes) * 0.5;
                link.visualizeWeight =
                    0.15 * (link.visualizeWeight ?? NaN) * (link.visualizeWeight ?? NaN);
            }
        }
    });
    // Then, we need to initialize nodes' positions based on components
    let countedNodes = 0;
    const ratios = [0];
    for (const component of graph.components) {
        ratios.push((countedNodes + component.nodes.length / 2) / graph.nodes.length);
        countedNodes += component.nodes.length;
    }
    graph.nodes.forEach((node) => {
        const ratio = ratios[(node.component?.id ?? -1) + 1];
        node.x =
            (Math.cos(ratio * 2 * Math.PI) - 0.5 + Math.random() * 0.15) * (effectiveNodes + 50);
        node.y =
            (Math.sin(ratio * 2 * Math.PI) - 0.5 + Math.random() * 0.15) * (effectiveNodes + 50);
    });
    return graph;
};
/** Build a concurrence code graph from the dataset. */
export const BuildConcurrenceGraph = () => {
    // Not implemented yet
};
/** Find the communities in the graph. */
export const findCommunities = (nodes, links, nodeEvaluator, linkEvaluator = (link) => link.weight ?? 1, minimumNodes = 3) => {
    // Create a graph
    const weights = new Map();
    const graph = new graphology.UndirectedGraph();
    nodes.forEach((node) => graph.addNode(node.id));
    links.forEach((link) => {
        const weight = linkEvaluator(link);
        if (weight > 0) {
            weights.set(graph.addEdge(link.source.id, link.target.id), weight);
        }
    });
    // Find the communities
    const communities = graphologyLibrary.communitiesLouvain(graph, {
        getEdgeWeight: (edge) => weights.get(edge) ?? NaN,
        resolution: 1.5,
        rng: new Math.seedrandom("deterministic"),
    });
    // Create the components
    let components = new Array(Object.values(communities).reduce((a, b) => Math.max(a, b), 0) + 1);
    for (let i = 0; i < components.length; i++) {
        components[i] = { id: -1, nodes: [] };
    }
    for (const node of nodes) {
        const community = communities[node.id];
        components[community].nodes.push(node);
    }
    // Find the representatives
    for (const component of components) {
        component.nodes = sortNodesByCentrality(component.nodes, links, nodeEvaluator, linkEvaluator);
        component.representative = component.nodes[0];
    }
    // Filter the components
    components = components.filter((Component) => Component.nodes.length >= minimumNodes);
    components.forEach((Component, Index) => {
        Component.id = Index;
        Component.nodes.forEach((Node) => (Node.component = Component));
    });
    // Sort the components
    const ComponentWeights = components.map((Component) => Component.nodes.reduce((A, B) => A + B.totalWeight, 0));
    components.sort((A, B) => ComponentWeights[B.id] - ComponentWeights[A.id]);
    return components;
};
/** Sort nodes by their relative centrality. */
export const sortNodesByCentrality = (nodes, links, nodeEvaluator, linkEvaluator = (link) => link.weight ?? 1) => {
    // Create a graph
    const weights = new Map();
    const graph = new graphology.UndirectedGraph();
    nodes.forEach((node) => graph.addNode(node.id));
    links
        .filter((link) => nodes.includes(link.source) && nodes.includes(link.target))
        .forEach((link) => {
        const weight = linkEvaluator(link);
        if (weight > 0) {
            weights.set(graph.addEdge(link.source.id, link.target.id), weight);
        }
    });
    // Find the central node
    const result = graphologyLibrary.metrics.centrality.pagerank(graph, {
        getEdgeWeight: (Edge) => weights.get(Edge) ?? NaN,
    });
    // Translate the result
    for (const node of nodes) {
        result[node.id] = result[node.id] * node.totalWeight + nodeEvaluator(node, links);
    }
    return nodes.sort((A, B) => result[B.id] - result[A.id]);
};
/** Filter a node by presence of the owner. */
export const filterNodeByOwner = (node, owner, nearOwners) => nearOwners ? node.nearOwners.has(owner) : node.owners.has(owner);
/** Filter a node by presence of some owners. */
export const filterNodeByOwners = (node, owners, nearOwners) => owners.some((owner) => filterNodeByOwner(node, owner, nearOwners));
/** Filter nodes by presence of the owner. */
export const filterNodesByOwner = (nodes, owner, nearOwners) => nodes.filter((Node) => filterNodeByOwner(Node, owner, nearOwners));
/** Filter a node by presence of any examples. */
export const filterNodeByExample = (node, ids) => filterCodeByExample(node.data, ids);
/** Filter a code by presence of any examples. */
export const filterCodeByExample = (code, ids) => code.examples?.some((example) => ids.some((id) => example === id || example.startsWith(`${id}|||`))) ?? false;
/** Filter items by user ID. */
export const filterItemByUser = (dataset, parameters) => Array.from(new Set(Object.values(dataset.data)
    .flatMap((chunk) => Object.entries(chunk))
    .flatMap(([, value]) => value.items)
    .filter((item) => {
    // TODO: Support subchunks
    if (!("uid" in item)) {
        return false;
    }
    return parameters.includes(item.uid);
})));
