import { extractExamples, findExampleSources, findOriginalCodes } from "../utils/dataset.js";
import { getCodebookColor } from "../utils/utils.js";
import { Panel } from "./panel.js";
/** The info panel for the visualizer. */
export class InfoPanel extends Panel {
    /** Panels in the info panel. */
    #panels = new Map();
    /** Constructing the side panel. */
    constructor(container, visualizer) {
        super(container, visualizer);
        visualizer.registerChosenCallback("Code", (node, status) => {
            this.showOrHidePanel(node, status);
        });
    }
    /** Show or hide a panel. */
    showOrHidePanel(node, status) {
        if (status) {
            this.showPanel(node);
        }
        else {
            this.hidePanel(node);
        }
    }
    /** Show a panel for a data node. */
    showPanel(node) {
        if (this.#panels.has(node.id)) {
            return;
        }
        const panel = this.buildPanel(node, false);
        this.#panels.set(node.id, panel);
        this.container.append(panel);
    }
    /** Hide a panel for a data node. */
    hidePanel(node) {
        this.#panels.get(node.id)?.remove();
        this.#panels.delete(node.id);
    }
    /** Build a panel for a data node. */
    buildPanel(node, everything = true) {
        const panel = $('<div class="panel"></div>');
        switch (node.type) {
            case "Code":
                this.buildPanelForCode(panel, node.data, everything);
                break;
            default:
                panel.append($(`<h3>Unknown node type: ${node.type}</h3>`));
                break;
        }
        return panel;
    }
    /** Build a panel for a code. */
    buildPanelForCode(panel, code, everything = true) {
        if (everything) {
            panel.append($(`<h3>${code.label}</h3>`));
        }
        else {
            panel.append($("<h3></h3>").append($(`<a href="javascript:void(0)">${code.label}</span>`).on("click", () => {
                this.dialog.showCode(0, code);
            })));
        }
        if (code.owners && code.owners.length > 0) {
            const owners = $('<p class="owners">By: </p>').appendTo(panel);
            for (const owner of code.owners) {
                if (owner === 0 && code.owners.length > 1) {
                    continue;
                }
                this.buildOwnerLink(code, findOriginalCodes(this.dataset.codebooks[owner], code, owner), owner).appendTo(owners);
            }
        }
        else if (code.alternatives && code.alternatives.length > 0) {
            panel.append($(`<p class="alternatives">Consolidated from: ${code.alternatives.join(", ")}</p>`));
        }
        if (code.definitions && code.definitions.length > 0) {
            panel.append($(`<p class="definition">${code.definitions[0]}</p>`));
        }
        else {
            panel.append($("<p><i>No definition available.</i></p>"));
        }
        if (code.examples && code.examples.length > 0) {
            const examples = extractExamples(code.examples);
            panel.append($("<hr>"));
            if (everything) {
                const list = $('<ol class="quote"></ol>').appendTo(panel);
                for (const example of examples) {
                    $("<li></li>")
                        .appendTo(list)
                        .append(this.buildExample(code, example[0], example[1]));
                }
            }
            else {
                const quote = $('<p class="quote"></p>').appendTo(panel);
                $("<span></span>")
                    .appendTo(quote)
                    .text(examples.keys().next().value ?? "");
                if (code.examples.length > 1) {
                    $(`<a href="javascript:void(0)">(${code.examples.length - 1} more)</a>`)
                        .appendTo(quote)
                        .on("click", () => {
                        this.dialog.showCode(0, code);
                    });
                }
            }
        }
    }
    /** Build a link for an owner. */
    buildOwnerLink(code, sources, owner) {
        const link = $(`<a href="javascript:void(0)" style="color: ${getCodebookColor(owner, this.dataset.codebooks.length)}">${this.dataset.names[owner]}</a>`);
        if (sources.length > 0) {
            link.attr("title", sources.map((original) => original.label).join(", "));
            link.on("click", () => {
                this.dialog.showCode(owner, code, ...sources);
            });
        }
        return link;
    }
    /** Build an element for a code example. */
    buildExample(code, example, ids = []) {
        let element = $(`<p>${example}</p>`);
        // Add the source links
        if (ids.length > 0) {
            ids.forEach((ID) => element.append(this.buildSourceLink(ID)));
        }
        // Add the owners
        if (code.owners && code.owners.length > 0) {
            const owners = $('<p class="owners">By: </p>');
            for (const owner of code.owners) {
                if (owner === 0) {
                    continue;
                }
                const sources = findExampleSources(this.dataset.codebooks[owner], code, example, owner);
                if (sources.length === 0) {
                    continue;
                }
                this.buildOwnerLink(code, sources, owner).appendTo(owners);
            }
            if (owners.children().length > 0) {
                element = element.add(owners);
            }
        }
        return element;
    }
    /** Build a link for a source. */
    buildSourceLink(id) {
        return $(`<a class="source" href="javascript:void(0)">${id}</a>`).on("click", () => {
            this.visualizer.dialog.showChunkOf(id);
        });
    }
}
