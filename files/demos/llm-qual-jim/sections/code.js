
import { Panel } from "../panels/panel.js";
import { filterNodesByOwner } from "../utils/graph.js";
import { getCodebookColor } from "../utils/utils.js";
/** The code side panel. */
export class CodeSection extends Panel {
    /** The short name of the panel. */
    name = "Codes";
    /** The title of the panel. */
    title = "Consolidated Codes";
    /** Constructing the panel. */
    constructor(container, visualizer) {
        super(container, visualizer);
        this.visualizer = visualizer;
        this.container = $('<div class="code"></div>').appendTo(container).hide();
    }
    /** Show the panel. */
    show() {
        this.container.show();
        this.showComponents();
    }
    /** RatioColorizer: The colorizer for ratios. */
    #ratioColorizer = d3.scaleSequential().interpolator(d3.interpolateViridis).domain([0, 1]);
    /** Show all components. */
    showComponents() {
        this.setRefresh(() => {
            this.container.empty();
            // Some notes
            $('<p class="tips"></p>')
                .appendTo(this.container)
                .html(`Clusters are not deterministic, only to help understand the data. Names are chosen by connectedness.
                    <a href="javascript:void(0)">Click here</a> to visualize codebooks' coverage by clusters.`)
                .find("a")
                .on("click", () => {
                this.visualizer.dialog.compareCoverageByClusters();
            });
            // Show the components
            const components = this.getGraph().components ?? [];
            this.container.append($(`<h3>${components.length} Clusters, ${this.dataset.codes.length} Codes</h3>`));
            this.buildTable(components, (row, component, idx) => {
                // Interactivity
                row.on("mouseover", (event) => {
                    this.visualizer.componentOver(event, component);
                })
                    .on("mouseout", (event) => {
                    this.visualizer.componentOut(event, component);
                })
                    .toggleClass("chosen", this.visualizer.isFilterApplied("Component", component));
                // Show the summary
                const summary = $('<td class="cluster-cell"></td>')
                    .attr("id", `cluster-${component.id}`)
                    .addClass("actionable")
                    .on("click", (event) => {
                    if (event.shiftKey) {
                        this.visualizer.componentChosen(event, component);
                    }
                    else {
                        this.showComponent(component);
                    }
                })
                    .appendTo(row);
                summary.append($("<h4></h4>").text(`#${idx + 1} ${component.representative?.data.label}`));
                // Calculate the coverage of each codebook
                const codebooks = this.dataset.names.reduce((prev, _name, idx) => {
                    prev.set(idx, filterNodesByOwner(component.nodes, idx, this.parameters.useNearOwners).length);
                    return prev;
                }, new Map());
                // Show the owners
                const owners = $('<p class="owners"></p>').appendTo(summary);
                this.dataset.names.forEach((_name, nameIndex) => {
                    const count = codebooks.get(nameIndex) ?? NaN;
                    if (nameIndex === 0 || count === 0) {
                        return;
                    }
                    owners.append($(`<a href="javascript:void(0)" style="color: ${getCodebookColor(nameIndex, this.dataset.codebooks.length)}">${this.dataset.names[nameIndex]}</a>`).attr("title", `${count} codes (${d3.format(".0%")(count / component.nodes.length)})`));
                });
                // Show the numbers
                const filtered = component.nodes.filter((node) => !node.hidden).length;
                const color = this.#ratioColorizer(filtered / component.nodes.length);
                $('<td class="metric-cell"></td>')
                    .css("background-color", color.toString())
                    .css("color", d3.lab(color).l > 70 ? "black" : "white")
                    .appendTo(row)
                    .text(`${filtered}`)
                    .append($("<p></p>").text(d3.format(".0%")(filtered / component.nodes.length)))
                    .on("click", (event) => {
                    this.visualizer.componentChosen(event, component);
                });
                $('<td class="number-cell actionable"></td>')
                    .appendTo(row)
                    .text(`${component.nodes.length}`)
                    .append($("<p></p>").text("100%"))
                    .on("click", (event) => {
                    this.visualizer.componentChosen(event, component);
                });
            }, ["Cluster", "Filtered", "Codes"]);
        });
    }
    /** Show a code component. */
    showComponent(component) {
        // Switch to the component, if not already
        if (!this.visualizer.isFilterApplied("Component", component)) {
            this.visualizer.componentChosen(new MouseEvent("virtual"), component);
        }
        // Show the component
        this.setRefresh(() => {
            const colorizer = this.visualizer.getColorizer();
            this.container.empty();
            // Some notes
            this.container.append($('<p class="tips"></p>').text("Note that clusters are not deterministic, only to help understand the data. Names are chosen from the most connected codes."));
            // Show the component
            this.container.append($(`<h3>${component.nodes.length} Codes</h3>`).prepend(this.buildReturn(() => {
                this.visualizer.componentChosen(new MouseEvent("virtual"), component);
                this.showComponents();
            })));
            this.buildTable(component.nodes, (row, node) => {
                // Interactivity
                row.on("mouseover", (event) => {
                    this.visualizer.nodeOver(event, node);
                })
                    .on("mouseout", (event) => {
                    this.visualizer.nodeOut(event, node);
                })
                    .toggleClass("chosen", this.visualizer.getStatus().chosenNodes.includes(node))
                    .on("click", (event) => {
                    if (this.visualizer.nodeChosen(event, node)) {
                        this.visualizer.centerCamera(node.x ?? NaN, node.y ?? NaN, 3);
                    }
                });
                // Show the summary
                const summary = $('<td class="code-cell actionable"></td>')
                    .attr("id", `code-${node.id}`)
                    .appendTo(row);
                // Calculate source codes
                const from = (node.data.alternatives ?? [])
                    .concat(node.data.label)
                    .filter((name) => Object.values(this.dataset.codebooks).some((code) => typeof code[name] !== "undefined")).length;
                // Colorize the code in the same way as the graph
                let color = node.hidden ? "#999999" : colorizer.colorize(node);
                summary.append($("<h4></h4>")
                    .append($(`<svg width="2" height="2" viewbox="0 0 2 2"><circle r="1" cx="1" cy="1" fill="${color}"></circle></svg>`))
                    .append($("<span></span>").text(node.data.label)));
                summary.append($('<p class="tips"></p>').text(`From ${from} codes`));
                // Show the consensus
                const owners = $('<td class="metric-cell"></td>').appendTo(row);
                // let OwnerSet = this.Parameters.UseNearOwners ? Node.Owners : Node.NearOwners;
                // let Count = [...OwnerSet].filter(Owner => this.Dataset.Weights![Owner] !== 0).length;
                const ratio = node.totalWeight / (this.dataset.totalWeight ?? NaN);
                color = this.#ratioColorizer(ratio);
                owners
                    .text(d3.format(".0%")(ratio))
                    .css("background-color", color.toString())
                    .css("color", d3.lab(color).l > 70 ? "black" : "white");
                // Show the examples
                row.append($('<td class="number-cell actionable"></td>').text(`${node.data.examples?.length ?? 0}`));
            }, ["Code", "Consensus", "Cases"]);
        });
    }
}
