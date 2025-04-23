
import { Panel } from "../panels/panel.js";
import { EvaluateUsers } from "../utils/evaluate.js";
import { UserFilter } from "../utils/filters.js";
/** UserSection: The speaker side panel. */
export class UserSection extends Panel {
    /** Name: The short name of the panel. */
    Name = "Speakers";
    /** Title: The title of the panel. */
    Title = "Speaker Overview";
    /** Constructor: Constructing the panel. */
    constructor(Container, Visualizer) {
        super(Container, Visualizer);
        this.Visualizer = Visualizer;
        this.Container = $('<div class="user"></div>').appendTo(Container).hide();
    }
    /** Render: Render the panel. */
    Render() {
        this.Container.empty();
        // Some notes
        this.Container.append($('<p class="tips"></p>').text("Note that all metrics are relative (i.e. against the Aggregated Code Space of the following Code Spaces)."));
        // Evaluate the codebooks
        const Users = Array.from(this.Dataset.UserIDToNicknames?.keys() ?? []);
        const Results = EvaluateUsers(this.Visualizer.Dataset, this.Parameters);
        const Metrics = Object.keys(Results[Users[0]]).slice(0, -1);
        const Colors = {};
        // Flatten the dataset
        const Dataset = [];
        for (const User of Users) {
            const Result = Results[User];
            for (const Metric of Metrics) {
                Dataset.push({
                    ID: User,
                    Name: this.Dataset.UserIDToNicknames?.get(User) ?? "",
                    Metric,
                    Value: Result[Metric],
                });
            }
        }
        // Build color scales
        for (const Metric of Metrics) {
            const Minimum = d3.min(Dataset.filter((Evaluation) => Evaluation.Metric === Metric), (Evaluation) => Evaluation.Value);
            const Maximum = d3.max(Dataset.filter((Evaluation) => Evaluation.Metric === Metric), (Evaluation) => Evaluation.Value);
            if (Metric === "Divergence") {
                Colors[Metric] = d3
                    .scaleSequential()
                    .interpolator(d3.interpolateViridis)
                    .domain([Maximum, Minimum]);
            }
            else {
                Colors[Metric] = d3
                    .scaleSequential()
                    .interpolator(d3.interpolateViridis)
                    .domain([Minimum, Maximum]);
            }
        }
        // Render the codebooks and evaluation results
        this.BuildTable(Object.entries(Results), (Row, [Key, Value], Index) => {
            // Name of the codebook
            const Summary = $('<td class="codebook-cell"></td>')
                .attr("id", `user-${Index + 1}`)
                .addClass("actionable")
                .appendTo(Row);
            Summary.append($("<h4></h4>").text(this.Dataset.UserIDToNicknames?.get(Key) ?? Key))
                .append($('<p class="tips"></p>').text(`${Results[Key].Count} items`))
                .on("mouseover", () => this.Visualizer.SetFilter(true, new UserFilter(), Key))
                .on("mouseout", () => this.Visualizer.SetFilter(true, new UserFilter()))
                .on("click", (Event) => {
                if (Event.shiftKey) {
                    this.Visualizer.SetFilter(false, new UserFilter(), Key, true);
                }
                else {
                    if (!this.Visualizer.IsFilterApplied("User", Key)) {
                        this.Visualizer.SetFilter(false, new UserFilter(), Key, Event.shiftKey, "Coverage");
                    }
                    this.Visualizer.Dialog.ShowUser(Key);
                }
            })
                .toggleClass("chosen", this.Visualizer.IsFilterApplied("User", Key));
            // Evaluation results
            Metrics.forEach((Metric) => {
                const MetricValue = Value[Metric];
                const Color = Colors[Metric](MetricValue);
                const Cell = $('<td class="metric-cell"></td>')
                    .attr("id", `metric-${Index}-${Metric}`)
                    .text(d3.format(Metric === "Divergence" ? ".1%" : ".1%")(MetricValue))
                    .on("mouseover", () => this.Visualizer.SetFilter(true, new UserFilter(), Key, false, Metric))
                    .on("mouseout", () => this.Visualizer.SetFilter(true, new UserFilter()))
                    .on("click", (Event) => this.Visualizer.SetFilter(false, new UserFilter(), Key, Event.shiftKey, Metric))
                    .css("background", Color)
                    .css("color", d3.lab(Color).l > 70 ? "black" : "white")
                    .toggleClass("chosen", this.Visualizer.IsFilterApplied("User", Key, Metric));
                Row.append(Cell);
            });
        }, ["Speaker", ...Metrics]);
    }
}
