
import { Panel } from "../panels/panel.js";
import { EvaluateUsers } from "../utils/evaluate.js";
import { OwnerFilter } from "../utils/filters.js";
/** UserSection: The speaker side panel. */
export class UserSection extends Panel {
    /** Name: The short name of the panel. */
    Name = "Users";
    /** Title: The title of the panel. */
    Title = "Speaker Overview";
    /** Constructor: Constructing the panel. */
    constructor(Container, Visualizer) {
        super(Container, Visualizer);
        this.Visualizer = Visualizer;
        this.Container = $(`<div class="user"></div>`).appendTo(Container).hide();
    }
    /** Render: Render the panel. */
    Render() {
        this.Container.empty();
        // Some notes
        this.Container.append($(`<p class="tips"></p>`).text("Note that all metrics are relative (i.e. against the Aggregated Code Space of the following Code Spaces)."));
        // Evaluate the codebooks
        var Users = Array.from(this.Dataset.UserIDToNicknames?.keys() ?? []);
        var Results = EvaluateUsers(this.Visualizer.Dataset, this.Parameters);
        var Metrics = Object.keys(Results[Users[0]]).slice(0, -2);
        var Colors = {};
        // Flatten the dataset
        var Dataset = [];
        for (var I = 0; I < Users.length; I++) {
            var Result = Results[Users[I]];
            for (var J = 0; J < Metrics.length; J++) {
                Dataset.push({ ID: Users[I], Name: this.Dataset.UserIDToNicknames?.get(Users[I]) ?? "",
                    Metric: Metrics[J], Value: Result[Metrics[J]] });
            }
        }
        // Build color scales
        for (var Metric of Metrics) {
            var Minimum = d3.min(Dataset.filter((Evaluation) => Evaluation.Metric == Metric), (Evaluation) => Evaluation.Value);
            var Maximum = d3.max(Dataset.filter((Evaluation) => Evaluation.Metric == Metric), (Evaluation) => Evaluation.Value);
            if (Metric == "Divergence") {
                Colors[Metric] = d3.scaleSequential().interpolator(d3.interpolateViridis).domain([Maximum, Minimum]);
            }
            else {
                Colors[Metric] = d3.scaleSequential().interpolator(d3.interpolateViridis).domain([Minimum, Maximum]);
            }
        }
        // Render the codebooks and evaluation results
        this.BuildTable(Object.entries(Results), (Row, [Key, Value], Index) => {
            // Name of the codebook
            var Summary = $(`<td class="codebook-cell"></td>`)
                .attr("id", `codebook-${Index + 1}`)
                .addClass("actionable")
                .appendTo(Row);
            Summary.append($(`<h4></h4>`).text(Key))
                .append($(`<p class="tips"></p>`).text(`0 items`))
                .on("mouseover", (Event) => this.Visualizer.SetFilter(true, new OwnerFilter(), Index + 1))
                .on("mouseout", (Event) => this.Visualizer.SetFilter(true, new OwnerFilter()))
                .on("click", (Event) => {
                if (Event.shiftKey) {
                    this.Visualizer.SetFilter(false, new OwnerFilter(), Index + 1, true);
                }
                else {
                    if (!this.Visualizer.IsFilterApplied("Owner", Index + 1))
                        this.Visualizer.SetFilter(false, new OwnerFilter(), Index + 1, Event.shiftKey, "Coverage");
                    this.Visualizer.SidePanel.ShowPanel("Codes");
                }
            })
                .toggleClass("chosen", this.Visualizer.IsFilterApplied("Owner", Index + 1));
            // Evaluation results
            Metrics.forEach((Metric) => {
                var MetricValue = Value[Metric];
                var Color = Colors[Metric](MetricValue);
                var Cell = $(`<td class="metric-cell"></td>`)
                    .attr("id", `metric-${Index}-${Metric}`)
                    .text(d3.format(Metric == "Divergence" ? ".1%" : ".1%")(MetricValue))
                    .on("mouseover", (Event) => this.Visualizer.SetFilter(true, new OwnerFilter(), Index + 1, false, Metric))
                    .on("mouseout", (Event) => this.Visualizer.SetFilter(true, new OwnerFilter()))
                    .on("click", (Event) => this.Visualizer.SetFilter(false, new OwnerFilter(), Index + 1, Event.shiftKey, Metric))
                    .css("background", Color)
                    .css("color", d3.lab(Color).l > 70 ? "black" : "white")
                    .toggleClass("chosen", this.Visualizer.IsFilterApplied("Owner", Index + 1, Metric));
                Row.append(Cell);
            });
        }, ["Codebook", ...Metrics]);
    }
}
