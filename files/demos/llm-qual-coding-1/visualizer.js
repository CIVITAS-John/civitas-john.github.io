
import { BuildSemanticGraph } from "./utils/graph.js";
import { ComponentFilter, OwnerFilter } from "./utils/filters.js";
import { Parameters, PostData } from "./utils/utils.js";
import { InfoPanel } from "./panels/info-panel.js";
import { SidePanel } from "./panels/side-panel.js";
import { Dialog } from "./panels/dialog.js";
import { Tutorial } from "./tutorial.js";
import { EvaluateCodebooks } from "./utils/evaluate.js";
/** Visualizer: The visualization manager. */
export class Visualizer {
    /** Container: The container for the visualization. */
    Container;
    /** HullLayer: The layer for the hulls. */
    HullLayer;
    /** LinkLayer: The layer for the links. */
    LinkLayer;
    /** NodeLayer: The layer for the nodes. */
    NodeLayer;
    /** LabelLayer: The layer for the labels. */
    LabelLayer;
    /** ComponentLayer: The layer for the components. */
    ComponentLayer;
    /** LegendContainer: The interface container of legends. */
    LegendContainer;
    /** FilterContainer: The interface container of filters. */
    FilterContainer;
    /** Zoom: The zoom behavior in-use. */
    Zoom;
    /** Dataset: The underlying dataset. */
    Dataset = {};
    /** Parameters: The parameters for the visualizer. */
    Parameters = new Parameters();
    /** InfoPanel: The information panel for the visualization. */
    InfoPanel;
    /** SidePanel: The side panel for the visualization. */
    SidePanel;
    /** Dialog: Dialog for the visualization. */
    Dialog;
    /** Tutorial: The tutorial for the visualization. */
    Tutorial;
    /** Constructor: Constructing the manager. */
    constructor(Container) {
        window.onpopstate = (Event) => this.PopState(Event);
        // Other components
        this.SidePanel = new SidePanel($(".side-panel"), this);
        this.InfoPanel = new InfoPanel($(".info-panel"), this);
        this.Dialog = new Dialog($(".dialog"), this);
        this.Tutorial = new Tutorial($(".portrait-overlay"), this);
        // Initialize the SVG
        var Root = d3.select(Container.get(0)).attr("style", `background-color: #290033`);
        this.Container = Root.append("svg");
        var Scaler = this.Container.append("g");
        this.HullLayer = Scaler.append("g").attr("class", "hulls");
        this.LinkLayer = Scaler.append("g").attr("class", "links");
        this.NodeLayer = Scaler.append("g").attr("class", "nodes");
        this.LabelLayer = Scaler.append("g").attr("class", "labels");
        this.ComponentLayer = Scaler.append("g").attr("class", "components");
        this.LegendContainer = Container.find(".legends");
        this.FilterContainer = Container.find(".filters");
        // Zoom support
        this.Zoom = d3
            .zoom()
            .scaleExtent([1, 8])
            .on("zoom", (event) => {
            Scaler.attr("transform", event.transform);
            var ScaleProgress = 1 - Math.max(0, 3 - event.transform.k) / 2;
            this.LinkLayer.style("opacity", 0.3 + ScaleProgress);
            // this.NodeLayer.style("opacity", 0.1 + ScaleProgress);
            this.LabelLayer.style("opacity", ScaleProgress);
            this.ComponentLayer.style("opacity", 2 - ScaleProgress * 2);
            this.ComponentLayer.style("display", ScaleProgress > 0.9 ? "none" : "block");
            // this.ComponentLayer.style("pointer-events", ScaleProgress > 0.6 ? "none" : "all");
        });
        this.Container.call(this.Zoom);
        // Load the data
        d3.json("network.json").then((Data) => {
            this.Dataset = Data;
            // Set the title
            document.title = this.Dataset.Title + document.title.substring(document.title.indexOf(":"));
            // Parse the date and nicknames as needed
            var Datasets = this.Dataset.Source;
            this.Dataset.UserIDToNicknames = new Map();
            for (var Dataset of Object.values(Datasets.Data))
                for (var Chunk of Object.values(Dataset))
                    for (var Item of Chunk.AllItems ?? []) {
                        Item.Time = new Date(Date.parse(Item.Time));
                        this.Dataset.UserIDToNicknames.set(Item.UserID, Item.Nickname);
                    }
            // Calculate the weights
            this.Dataset.Weights = this.Dataset.Weights ?? this.Dataset.Names.map((_, Index) => (Index == 0 ? 0 : 1));
            this.Dataset.TotalWeight = this.Dataset.Weights.reduce((A, B) => A + B, 0);
            // Build the default graph
            this.SetStatus("Code", BuildSemanticGraph(this.Dataset, this.Parameters));
            this.SidePanel.Show();
            // Evaluate and send back the results
            var Results = EvaluateCodebooks(this.Dataset, this.Parameters);
            PostData("/api/report/", Results);
        });
    }
    // Status management
    /** Status: The status of the visualization. */
    Status = {};
    /** StatusType: The type of the status. */
    StatusType = "";
    /** SetStatus: Use a new graph for visualization. */
    SetStatus(Type, Graph) {
        this.PreviewFilter = undefined;
        this.Filters.clear();
        this.Status = { Graph, ChosenNodes: [] };
        this.StatusType = Type;
        this.Rerender(true);
        this.CenterCamera(0, 0, 1);
    }
    /** GetStatus: Get the status of the visualization. */
    GetStatus() {
        return this.Status;
    }
    /** Rerender: Rerender the visualization. */
    Rerender(Relayout = false) {
        // Apply the filter
        this.Status.Graph.Nodes.forEach((Node) => {
            var Filtered = true;
            this.Filters.forEach((Filter) => (Filtered = Filtered && Filter.Filter(this, Node)));
            if (this.PreviewFilter)
                Filtered = Filtered && this.PreviewFilter.Filter(this, Node);
            Node.Hidden = !Filtered;
        });
        this.Status.Graph.Links.forEach((Link) => {
            Link.Hidden = Link.Source.Hidden || Link.Target.Hidden;
        });
        this.Status.Graph.Components?.forEach((Component) => {
            Component.CurrentNodes = Component.Nodes.filter((Node) => !Node.Hidden);
        });
        // Chose the renderer
        var Renderer = (Alpha) => { };
        switch (this.StatusType) {
            case "Code":
                Renderer = (Alpha) => this.RenderCodes(Alpha);
                break;
        }
        // Render the visualization
        if (Relayout)
            this.GenerateLayout(this.Status.Graph, Renderer);
        else
            Renderer(0);
    }
    /** CenterCamera: Center the viewport camera to a position and scale.*/
    CenterCamera(X, Y, Zoom, Animated = true) {
        if (Animated) {
            this.Container.transition()
                .duration(500)
                .call(this.Zoom.translateTo, X, Y)
                .transition()
                .call(this.Zoom.scaleTo, Zoom);
        }
        else {
            this.Zoom.translateTo(this.Container, X, Y);
            this.Zoom.scaleTo(this.Container, Zoom);
        }
    }
    // Filters
    /** Filters: The current filters of the graph. */
    Filters = new Map();
    /** PreviewFilter: The previewing filter of the graph. */
    PreviewFilter;
    /** SetFilter: Try to set a filter for the visualization. */
    SetFilter(Previewing, Filter, Parameters = undefined, Additive = false, Mode = "") {
        if (Previewing) {
            if (Parameters == undefined) {
                delete this.PreviewFilter;
                Parameters = undefined;
            }
            else if (this.Filters.has(Filter.Name)) {
                // Do not preview something fixed
                delete this.PreviewFilter;
                Parameters = undefined;
            }
            else if (Filter.Name == this.PreviewFilter?.Name) {
                if (!this.PreviewFilter?.ToggleParameters(Parameters, Additive, Mode) && this.PreviewFilter?.Parameters.length == 0) {
                    delete this.PreviewFilter;
                    Parameters = undefined;
                }
            }
            else {
                this.PreviewFilter = Filter;
                this.PreviewFilter.SetParameter([Parameters]);
                this.PreviewFilter.Mode = Mode;
            }
        }
        else {
            var Incumbent = this.Filters.get(Filter.Name);
            if (Parameters == undefined) {
                this.Filters.delete(Filter.Name);
                Parameters = undefined;
            }
            else if (Filter.Name == Incumbent?.Name) {
                if (!Incumbent?.ToggleParameters(Parameters, Additive, Mode) && Incumbent?.Parameters.length == 0) {
                    this.Filters.delete(Filter.Name);
                    Parameters = undefined;
                }
            }
            else {
                this.Filters.set(Filter.Name, Filter);
                Filter.SetParameter([Parameters]);
                Filter.Mode = Mode;
            }
            delete this.PreviewFilter;
        }
        if (!Previewing)
            this.NodeChosen(new Event("click"), undefined);
        this.Rerender();
        if (!Previewing) {
            this.RenderFilters();
            this.SidePanel.Render();
        }
        return Parameters != undefined;
    }
    /** GetColorizer: Get the colorizer for the visualization. */
    GetColorizer() {
        var Colorizer = this.PreviewFilter?.GetColorizer(this);
        if (!Colorizer) {
            for (var Filter of this.Filters.values()) {
                Colorizer = Filter.GetColorizer(this);
                if (Colorizer)
                    break;
            }
        }
        if (!Colorizer)
            Colorizer = new OwnerFilter().GetColorizer(this);
        return Colorizer;
    }
    /** IsFilterApplied: Check if a filter is applied. */
    IsFilterApplied(Name, Parameter, Mode) {
        var Filter = this.Filters.get(Name);
        if (Mode && Filter?.Mode != Mode)
            return false;
        return Filter?.Parameters.includes(Parameter) ?? false;
    }
    /** RenderFilters: Render all current filters. */
    RenderFilters() {
        this.FilterContainer.empty();
        this.Filters.forEach((Filter, Name) => {
            var Container = $(`<div class="filter"></div>`).appendTo(this.FilterContainer);
            Container.append($("<span></span>").text(Filter.Name + ":"));
            var Names = Filter.GetParameterNames(this);
            for (var I = 0; I < Filter.Parameters.length; I++) {
                var Parameter = Filter.Parameters[I];
                var Label = Names[I];
                Container.append($(`<a href="javascript:void(0)" class="parameter"></a>`)
                    .text(Label)
                    .on("click", () => this.SetFilter(false, Filter, Parameter)));
            }
            Container.append($(`<a href="javascript:void(0)" class="close"></a>`)
                .text("X")
                .on("click", () => this.SetFilter(false, Filter)));
        });
    }
    // Node events
    /** NodeOver: Handle the mouse-over event on a node. */
    NodeOver(Event, Node) {
        SetClassForNode(Node.ID, "hovering", true);
        SetClassForLinks(Node.ID, "hovering", true);
        if (!this.GetStatus().ChosenNodes.includes(Node))
            this.TriggerChosenCallback(Node, true);
    }
    /** NodeOut: Handle the mouse-out event on a node. */
    NodeOut(Event, Node) {
        SetClassForNode(Node.ID, "hovering", false);
        SetClassForLinks(Node.ID, "hovering", false);
        if (!this.GetStatus().ChosenNodes.includes(Node))
            this.TriggerChosenCallback(Node, false);
    }
    /** OnChosen: The callback for chosen nodes. */
    ChosenCallbacks = new Map();
    /** RegisterChosenCallback: Register a callback for a certain data type. */
    RegisterChosenCallback(Name, Callback) {
        this.ChosenCallbacks.set(Name, Callback);
    }
    /** TriggerChosenCallback: Trigger a callback for a certain node. */
    TriggerChosenCallback(Node, Status) {
        var Callback = this.ChosenCallbacks.get(Node.Type);
        if (Callback)
            Callback(Node, Status);
    }
    /** NodeChosen: Handle the click event on a node. */
    NodeChosen(Event, Node, Additive = false) {
        var Chosens = this.GetStatus().ChosenNodes;
        var Incumbent = Node && Chosens.includes(Node);
        // If no new mode, remove all
        // If there is a new mode and no shift key, remove all
        var Removal = Node == undefined || (!Additive && !Incumbent && !Event.shiftKey);
        if (Removal) {
            Chosens.forEach((Node) => {
                SetClassForNode(Node.ID, "chosen", false);
                SetClassForLinks(Node.ID, "chosen-neighbor", false);
                this.TriggerChosenCallback(Node, false);
            });
            Chosens = [];
        }
        if (Node) {
            if (!Incumbent) {
                // If there is a new mode, add it
                Chosens.push(Node);
                SetClassForNode(Node.ID, "chosen", true);
                SetClassForLinks(Node.ID, "chosen-neighbor", true);
                this.TriggerChosenCallback(Node, true);
            }
            else {
                // If the node is chosen, remove it
                Chosens.splice(Chosens.indexOf(Node), 1);
                SetClassForNode(Node.ID, "chosen", false);
                SetClassForLinks(Node.ID, "chosen-neighbor", false);
                this.TriggerChosenCallback(Node, false);
            }
        }
        // Update the status
        this.GetStatus().ChosenNodes = Chosens;
        this.Container.classed("node-chosen", Chosens.length > 0);
        this.SidePanel.Render();
        return Node !== undefined && Chosens.includes(Node);
    }
    /** FocusOnNode: Focus on a node by its SVG element. */
    FocusOnNode(Element) {
        var Node = d3.select(Element).datum();
        this.CenterCamera(Node.x, Node.y, 3, false);
        if (!this.GetStatus().ChosenNodes.includes(Node))
            this.NodeChosen(new Event("click"), Node);
    }
    // Component events
    /** ComponentOver: Handle the mouse-over event on a component. */
    ComponentOver(Event, Component) {
        SetClassForComponent(Component, "hovering", true);
    }
    /** ComponentOut: Handle the mouse-out event on a component. */
    ComponentOut(Event, Component) {
        SetClassForComponent(Component, "hovering", false);
    }
    /** ComponentChosen: Handle the click event on a component. */
    ComponentChosen(Event, Component) {
        var Status = this.SetFilter(false, new ComponentFilter(), Component, Event?.shiftKey == true);
        if (Status)
            this.CenterCamera(d3.mean(Component.Nodes.map((Node) => Node.x)), d3.mean(Component.Nodes.map((Node) => Node.y)), 3);
        SetClassForComponent(Component, "chosen", Status, false);
        this.Container.classed("component-chosen", Status);
    }
    // Rendering
    /** RenderLegends: Render the legends for the visualization. */
    RenderLegends(Colorizer) {
        // Check if the legends are up-to-date
        var Hash = JSON.stringify(Colorizer.Examples) + JSON.stringify(Object.values(Colorizer.Results).map((Values) => Values.length));
        if (this.LegendContainer.data("hash") == Hash)
            return;
        this.LegendContainer.empty().data("hash", Hash);
        // Render the legends
        for (var Example in Colorizer.Examples) {
            var Color = Colorizer.Examples[Example];
            this.LegendContainer.append(`<div class="legend">
                <svg width="20" height="20"><circle cx="10" cy="10" r="8" fill="${Color}"/></svg>
                <span>${Example} (${Colorizer.Results?.[Color]?.length ?? 0})</span>
            </div>`);
        }
    }
    /** RenderCodes: Render the coding graph to the container. */
    RenderCodes(Alpha) {
        // Basic settings
        this.Container.attr("viewBox", "0 0 300 300");
        this.Zoom.extent([
            [0, 0],
            [300, 300],
        ]);
        // Find the colorizer to use
        var Colorizer = this.GetColorizer();
        Colorizer.Results = {};
        // Render nodes
        var Graph = this.GetStatus().Graph;
        var AllNodes = this.NodeLayer.selectAll("circle").data(Graph.Nodes);
        AllNodes.exit().remove();
        AllNodes.join((Enter) => Enter.append("circle")
            .attr("id", (Node) => `node-${Node.ID}`)
            .attr("label", (Node) => Node.Data.Label)
            .on("mouseover", (Event, Node) => this.NodeOver(Event, Node))
            .on("mouseout", (Event, Node) => this.NodeOut(Event, Node))
            .on("click", (Event, Node) => this.NodeChosen(Event, Node)), (Update) => Update)
            // Set the fill color based on the number of owners
            .attr("fill", (Node) => {
            var Color = Colorizer.Colorize(Node);
            if (Node.Hidden)
                Color = "#999999";
            if (!Colorizer.Results[Color])
                Colorizer.Results[Color] = [];
            Colorizer.Results[Color].push(Node);
            return Color;
        })
            // Set the radius based on the number of examples
            .attr("r", (Node) => Node.Size * 0.5)
            .attr("cx", (Node) => Node.x)
            .attr("cy", (Node) => Node.y)
            .classed("hidden", (Node) => Node.Hidden ?? false);
        // Render legends
        this.RenderLegends(Colorizer);
        // Render labels
        var AllLabels = this.LabelLayer.selectAll("text").data(Graph.Nodes);
        AllLabels.exit().remove();
        if (Alpha <= 0.3) {
            AllLabels.join((Enter) => Enter.append("text")
                .attr("id", (Node) => `label-${Node.ID}`)
                .text((Node) => Node.Data.Label)
                .attr("fill", "#e0e0e0")
                .attr("fill-opacity", 0.7)
                .attr("font-size", 1.2), (Update) => Update)
                .attr("x", (Node) => Node.x + Node.Size * 0.5 + 0.25)
                .attr("y", (Node) => Node.y + 0.27)
                .classed("hidden", (Node) => Node.Hidden ?? false);
        }
        // Render links
        var DistanceLerp = d3.scaleSequential().clamp(true).domain([Graph.MaximumDistance, this.Parameters.LinkMinimumDistance]);
        var DistanceColor = d3
            .scaleSequential()
            .clamp(true)
            .domain([Graph.MaximumDistance, this.Parameters.LinkMinimumDistance])
            .interpolator(d3.interpolateViridis);
        var AllLinks = this.LinkLayer.selectAll("line").data(Graph.Links);
        AllLinks.exit().remove();
        AllLinks.join((Enter) => Enter.append("line")
            .attr("sourceid", (Link) => `${Link.Source.ID}`)
            .attr("targetid", (Link) => `${Link.Target.ID}`)
            .attr("stroke-width", 0.2)
            // Color the links based on the distance
            .attr("stroke", (Link) => DistanceColor(Link.Distance))
            .attr("stroke-opacity", 0.2)
            .attr("distance", (Link) => Link.Distance)
            .attr("interpolated", (Link) => DistanceLerp(Link.Distance)), (Update) => Update)
            .attr("x1", (Link) => Link.Source.x)
            .attr("y1", (Link) => Link.Source.y)
            .attr("x2", (Link) => Link.Target.x)
            .attr("y2", (Link) => Link.Target.y)
            .classed("hidden", (Link) => Link.Hidden ?? false);
        // Visualize components
        if (Graph.Components) {
            var Filtered = this.PreviewFilter != undefined || this.Filters.size > 0;
            // Calculate the hulls
            Graph.Components.forEach((Component) => {
                var Hull = d3.polygonHull(Component.Nodes.map((Node) => [Node.x, Node.y]));
                if (Hull) {
                    Component.Hull = Hull;
                    Component.Centroid = d3.polygonCentroid(Hull);
                }
                else
                    delete Component.Hull;
            });
            var Components = Graph.Components.filter((Component) => Component.Hull);
            var AllHulls = this.HullLayer.selectAll("path").data(Components);
            AllHulls.exit().remove();
            AllHulls.join((Enter) => Enter.append("path")
                .attr("id", (Component) => `hull-${Component.ID}`)
                .attr("fill", (Component) => d3.interpolateSinebow(Components.indexOf(Component) / Components.length))
                .attr("stroke", (Component) => d3.interpolateSinebow(Components.indexOf(Component) / Components.length))
                .on("mouseover", (Event, Component) => {
                this.ComponentOver(Event, Component);
            })
                .on("mouseout", (Event, Component) => {
                this.ComponentOut(Event, Component);
            })
                .on("click", (Event, Component) => {
                this.ComponentChosen(Event, Component);
            }), (Update) => Update).attr("d", (Component) => `M${Component.Hull.join("L")}Z`);
            // Render the component labels
            var AllComponents = this.ComponentLayer.selectAll("text").data(Components);
            AllComponents.exit().remove();
            AllComponents.join((Enter) => Enter.append("text")
                .attr("id", (Component) => `component-${Component.ID}`)
                .attr("font-size", 5)
                .attr("text-anchor", "middle")
                .attr("dominant-baseline", "middle")
                .attr("stroke", (Component) => d3.interpolateSinebow(Components.indexOf(Component) / Components.length)), (Update) => Update)
                .text((Component) => {
                if (Component.CurrentNodes && Filtered)
                    return `${Component.Representative.Data.Label} (${Component.CurrentNodes.length}/${Component.Nodes.length})`;
                else
                    return `${Component.Representative.Data.Label} (${Component.Nodes.length})`;
            })
                .attr("fill", (Component) => {
                if (Component.CurrentNodes && Filtered)
                    return d3.interpolateViridis(Component.CurrentNodes.length / Component.Nodes.length);
                else
                    return "#ffffff";
            })
                .attr("x", (Component) => Component.Centroid[0])
                .attr("y", (Component) => Component.Centroid[1]);
            // .attr("x", (Component) => d3.mean(Component.Nodes.map(Node => Node.x!))!)
            // .attr("y", (Component) => d3.mean(Component.Nodes.map(Node => Node.y!))!);
        }
        else
            this.ComponentLayer.selectAll("text").remove();
    }
    // Layouting
    /** Simulation: The force simulation in-use. */
    Simulation;
    /** GenerateLayout: Generate the network layout using a force-based simulation.  */
    GenerateLayout(Graph, Renderer) {
        var DistanceScale = Math.max(5, Math.sqrt(Graph.Nodes.length));
        this.Simulation = d3.forceSimulation();
        var ForceLink = d3.forceLink();
        this.Simulation.nodes(Graph.Nodes)
            .force("repulse", d3
            .forceManyBody()
            .distanceMax(30)
            .strength(-DistanceScale * 5))
            .force("center", d3.forceCenter().strength(0.01))
            .force("link", ForceLink.links(Graph.Links.filter((Link) => Link.VisualizeWeight >= 0.1))
            .id((Node) => Node.index)
            .distance((Link) => DistanceScale)
            .strength((Link) => Link.VisualizeWeight))
            .force("collide", d3.forceCollide().radius((Node) => Node.Size + 2))
            .on("tick", () => {
            Renderer(this.Simulation.alpha());
            if (this.Simulation.alpha() <= 0.001) {
                this.Tutorial.ShowTutorial();
                Handler.stop();
            }
        });
        var Handler = this.Simulation.alpha(1).alphaTarget(0).restart();
    }
    // History
    /** History: The history of the visualizer. */
    History = new Map();
    /** PushState: Push a new state to the history. */
    PushState(Name, Callback) {
        this.History.set(Name, Callback);
        window.history.pushState(Name, Name, `#${Name}`);
    }
    /** PopState: Handle the pop state event. */
    PopState(Event) {
        // If there is no hash, hide the dialog
        if (window.location.hash == "") {
            this.Dialog.Hide();
            return;
        }
        // Otherwise, trigger the callback
        var Callback = this.History.get(window.location.hash.slice(1));
        if (Callback)
            Callback();
    }
}
/** SetClassForComponent: Set a class for a component and its nodes. */
function SetClassForComponent(Component, Class, Status, ForNodes = true) {
    $(`#component-${Component.ID}`).toggleClass(Class, Status);
    $(`#hull-${Component.ID}`).toggleClass(Class, Status);
    if (ForNodes)
        Component.Nodes.forEach((Node) => {
            SetClassForNode(Node.ID, Class, Status);
            // SetClassForLinks(Node.ID, Class, Status, (Other) => Component.Nodes.findIndex(Node => Node.ID == Other) != -1);
        });
}
/** SetClassForNode: Set a class for a node and its label. */
function SetClassForNode(ID, Class, Status) {
    $(`#node-${ID}`).toggleClass(Class, Status);
    $(`#label-${ID}`).toggleClass(Class, Status);
}
/** SetClassForLinks: Set a class for links and linked nodes of a node. */
function SetClassForLinks(ID, Class, Status, Filter) {
    var Links = $(`line[sourceid="${ID}"]`);
    Links.each((Index, Element) => {
        var Filtered = Filter?.($(Element).attr("targetid")) ?? true;
        $(Element).toggleClass(Class, Status && Filtered);
        SetClassForNode($(Element).attr("targetid"), Class, Status && Filtered);
    });
    Links = $(`line[targetid="${ID}"]`);
    Links.each((Index, Element) => {
        var Filtered = Filter?.($(Element).attr("sourceid")) ?? true;
        $(Element).toggleClass(Class, Status && Filtered);
        SetClassForNode($(Element).attr("sourceid"), Class, Status && Filtered);
    });
}
