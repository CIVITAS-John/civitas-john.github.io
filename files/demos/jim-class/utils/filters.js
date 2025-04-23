
import { filterItemByUser, filterNodeByExample, filterNodeByOwner, filterNodeByOwners, } from "./graph.js";
/** The base class for filters. */
export class FilterBase {
    /** The parameters of the filter. */
    parameters = [];
    /** The mode of the filter. */
    mode = "";
    /** Get the colorizer for this filter. */
    getColorizer(_visualizer) {
        return;
    }
    /** Get the names of the parameters. */
    getParameterNames(_visualizer) {
        return this.parameters.map((param) => JSON.stringify(param));
    }
    /** Toggle the parameters of the filter. */
    toggleParameters(newParam, additive, mode) {
        if (mode === this.mode && this.parameters.includes(newParam)) {
            this.parameters.splice(this.parameters.indexOf(newParam), 1);
            this.setParameter(this.parameters);
            return false;
        }
        if (!this.parameters.includes(newParam)) {
            if (additive) {
                this.parameters.splice(this.parameters.length - 1, 0, newParam);
                this.setParameter(this.parameters);
            }
            else {
                this.setParameter([newParam]);
            }
        }
        this.mode = mode;
        return true;
    }
    /** Set the parameters of the filter. */
    setParameter(newParam) {
        this.parameters = newParam;
    }
}
/** Filter the nodes by their datasets. */
export class DatasetFilter extends FilterBase {
    /** The name of the filter. */
    name = "Dataset";
    /** The IDs of the examples. */
    #exampleIDs = [];
    /** The filter function. */
    filter(visualizer, node) {
        if (this.#exampleIDs.length === 0) {
            const sources = visualizer.dataset.source.data;
            this.#exampleIDs = Array.from(new Set(Object.entries(sources)
                .filter(([k]) => this.parameters.includes(k))
                .flatMap(([, v]) => Object.values(v).flatMap((item) => item.items))
                .map((example) => example.id)));
        }
        return filterNodeByExample(node, this.#exampleIDs);
    }
    /** Set the parameters of the filter. */
    setParameter(newParams) {
        this.parameters = newParams;
        this.#exampleIDs = [];
    }
}
/** ChunkFilter: Filter the nodes by their chunks. */
export class ChunkFilter extends FilterBase {
    /** The name of the filter. */
    name = "Chunk";
    /** The IDs of the examples. */
    #exampleIDs = [];
    /** The filter function. */
    filter(visualizer, node) {
        if (this.#exampleIDs.length === 0) {
            const sources = visualizer.dataset.source.data;
            this.#exampleIDs = Array.from(new Set(Object.values(sources)
                .flatMap((chunk) => Object.entries(chunk))
                .filter(([k]) => this.parameters.includes(k))
                .flatMap(([, value]) => value.items)
                .map((example) => example.id)));
        }
        return filterNodeByExample(node, this.#exampleIDs);
    }
    /** Set the parameters of the filter. */
    setParameter(newParams) {
        this.parameters = newParams;
        this.#exampleIDs = [];
    }
}
/** Filter the nodes by the item's UserID. */
export class UserFilter extends FilterBase {
    /** The name of the filter. */
    name = "Speaker";
    /** The IDs of the examples. */
    #exampleIDs = [];
    /** Get the names of the parameters. */
    getParameterNames(visualizer) {
        return this.parameters.map((param) => visualizer.dataset.uidToNicknames?.get(param) ?? param);
    }
    /** The filter function. */
    filter(visualizer, node) {
        if (this.#exampleIDs.length === 0) {
            this.#exampleIDs = filterItemByUser(visualizer.dataset.source, this.parameters).map((item) => item.id);
        }
        return filterNodeByExample(node, this.#exampleIDs);
    }
    /** Set the parameters of the filter. */
    setParameter(newParams) {
        this.parameters = newParams;
        this.#exampleIDs = [];
    }
}
/** Filter the nodes by their components. */
export class ComponentFilter extends FilterBase {
    /** The name of the filter. */
    name = "Component";
    /** Get the names of the parameters. */
    getParameterNames(_visualizer) {
        return this.parameters.map((param) => param.representative?.data.label ?? "");
    }
    /** The filter function. */
    filter(_visualizer, node) {
        if (!node.component) {
            return false;
        }
        return this.parameters.includes(node.component);
    }
}
/** Filter the nodes by their owners. */
export class OwnerFilter extends FilterBase {
    /** The name of the filter. */
    name = "Owner";
    /** The filter function. */
    filter(visualizer, node) {
        return filterNodeByOwners(node, this.parameters, visualizer.parameters.useNearOwners || this.parameters.length === 1);
    }
    /** Get the names of the parameters. */
    getParameterNames(visualizer) {
        return this.parameters.map((param) => visualizer.dataset.names[param]);
    }
    /** Get the colorizer for this filter. */
    getColorizer(visualizer) {
        if (this.parameters.length === 0) {
            return new OwnerColorizer(visualizer.dataset.weights
                ?.map((Weight, Index) => (Weight > 0 ? Index : -1))
                .filter((Index) => Index >= 0) ?? [], visualizer);
        }
        else if (this.parameters.length === 1) {
            if (this.mode === "novelty" || this.mode === "divergence") {
                return new NoveltyColorizer(this.parameters[0], visualizer);
            }
            return new CoverageColorizer(this.parameters[0]);
        }
        else if (this.parameters.length === 2) {
            return new ComparisonColorizer(this.parameters[0], this.parameters[1], visualizer);
        }
        return new OwnerColorizer(this.parameters, visualizer);
    }
}
/** Colorize the nodes by an owner's coverage. */
export class CoverageColorizer {
    owner;
    /** Create a coverage colorizer. */
    constructor(owner) {
        this.owner = owner;
    }
    /** The colorizer function. */
    colorize(Node) {
        return d3.interpolateCool(Node.owners.has(this.owner) ? 1 : Node.nearOwners.has(this.owner) ? 0.55 : 0.1);
    }
    /** The examples of the colorizer. */
    examples = {
        "In the codebook": d3.interpolateCool(1),
        "Has a similar concept": d3.interpolateCool(0.55),
        "Not covered": "#999999",
    };
}
/** Colorize the nodes by their novelty. */
export class NoveltyColorizer {
    owner;
    visualizer;
    /** Create a novelty colorizer. */
    constructor(owner, visualizer) {
        this.owner = owner;
        this.visualizer = visualizer;
    }
    /** The colorizer function. */
    colorize(node) {
        // Not covered
        if (!node.nearOwners.has(this.owner)) {
            return "#999999";
        }
        if (node.owners.has(this.owner)) {
            let novel = true;
            node.owners.forEach((Owner) => {
                if (Owner !== this.owner && (this.visualizer.dataset.weights?.[Owner] ?? NaN) > 0) {
                    novel = false;
                }
            });
            // Novel / Conform
            return d3.interpolatePlasma(novel ? 1 : 0.35);
        }
        // Nearly conform
        return d3.interpolatePlasma(0.7);
    }
    /** The examples of the colorizer. */
    examples = {
        "Novel: only in this codebook": d3.interpolatePlasma(1),
        "Conform: has a similar concept": d3.interpolatePlasma(0.7),
        "Conform: in the codebook": d3.interpolatePlasma(0.35),
        "Not covered": "#999999",
    };
}
/** Colorize the nodes by two owners' coverage. */
export class ComparisonColorizer {
    owner1;
    owner2;
    visualizer;
    /** Create a comparison colorizer. */
    constructor(owner1, owner2, visualizer) {
        this.owner1 = owner1;
        this.owner2 = owner2;
        this.visualizer = visualizer;
        this.examples["Both codebooks"] = d3.schemeTableau10[5];
        this.examples[`Only in ${visualizer.dataset.names[owner1]}`] = d3.schemeTableau10[2];
        this.examples[`Only in ${visualizer.dataset.names[owner2]}`] = d3.schemeTableau10[4];
        this.examples["Not covered"] = "#999999";
    }
    /** The colorizer function. */
    colorize(node) {
        const nearOwner = filterNodeByOwner(node, this.owner1, this.visualizer.parameters.useNearOwners);
        const nearOther = filterNodeByOwner(node, this.owner2, this.visualizer.parameters.useNearOwners);
        return nearOwner && nearOther
            ? d3.schemeTableau10[5]
            : nearOwner
                ? d3.schemeTableau10[2]
                : nearOther
                    ? d3.schemeTableau10[4]
                    : "#999999";
    }
    /** The examples of the colorizer. */
    examples = {};
}
/** Colorize the nodes by how many owners they have. */
export class OwnerColorizer {
    owners;
    visualizer;
    /** Create an owner colorizer. */
    constructor(owners, visualizer) {
        this.owners = owners;
        this.visualizer = visualizer;
        for (let i = 1; i <= owners.length; i++) {
            this.examples[`In${this.visualizer.parameters.useNearOwners ? " (or near)" : ""} ${i} codebooks`] = d3.interpolateViridis(i / owners.length);
        }
        this.examples["Not covered"] = "#999999";
    }
    /** The colorizer function. */
    colorize(node) {
        const count = this.owners.filter((Owner) => filterNodeByOwner(node, Owner, this.visualizer.parameters.useNearOwners)).length;
        return count === 0 ? "#999999" : d3.interpolateViridis(count / this.owners.length);
    }
    /** The examples of the colorizer. */
    examples = {};
}
