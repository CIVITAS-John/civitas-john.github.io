/** Panel: A panel for the visualizer. */
export class Panel {
    container;
    visualizer;
    /** The short name of the panel. */
    name = "";
    /** The title of the panel. */
    title = "";
    /** The codebook dataset of the visualizer. */
    get dataset() {
        return this.visualizer.dataset;
    }
    /** The source dataset of the visualizer. */
    get source() {
        return this.visualizer.dataset.source;
    }
    /** The information panel for the visualization. */
    get infoPanel() {
        return this.visualizer.infoPanel;
    }
    /** The side panel for the visualization. */
    get sidePanel() {
        return this.visualizer.sidePanel;
    }
    /** Dialog for the visualization. */
    get dialog() {
        return this.visualizer.dialog;
    }
    /** The parameters of the visualizer. */
    get parameters() {
        return this.visualizer.parameters;
    }
    /** The current graph of the visualizer. */
    getGraph() {
        return this.visualizer.getStatus().graph;
    }
    /** Constructing the side panel. */
    constructor(
    /** The container for the side panel. */
    container, 
    /** The visualizer in-use. */
    visualizer) {
        this.container = container;
        this.visualizer = visualizer;
    }
    /** Show the panel. */
    show() {
        this.container.show();
        this.render();
    }
    /** Hide the panel. */
    hide() {
        this.container.hide();
    }
    /** Toggle the panel. */
    toggle() {
        this.container.toggle();
    }
    /** Render the panel. */
    render() {
        this.refresh();
    }
    /** The current program that actually renders the panel. Optional. */
    refresh = () => {
        // This method is intentionally left empty
    };
    /** Set the refresh function for the panel. */
    setRefresh(refresh) {
        this.refresh = refresh;
        refresh();
    }
    /** Build a table for the panel. */
    buildTable(data, builder, columns = []) {
        const table = $('<table class="data-table"></table>').appendTo(this.container);
        if (columns.length > 0) {
            table.append($("<tr></tr>").append(...columns.map((c) => $("<th></th>").text(c))));
        }
        data.forEach((item, idx) => {
            builder($("<tr></tr>").appendTo(table), item, idx);
        });
        return table;
    }
    /** Build a list for the panel. */
    buildList(data, builder, type = "ul") {
        const list = $(`<${type}></${type}>`).appendTo(this.container);
        data.forEach((item, idx) => {
            builder($("<li></li>").appendTo(list), item, idx);
        });
        return list;
    }
    /** Build a return button. */
    buildReturn(callback) {
        return $('<a href="javascript:void(0)">↑</a>').on("click", callback);
    }
}
