/** Panel: A panel for the visualizer. */
export class Panel {
    /** Name: The short name of the panel. */
    Name = "";
    /** Title: The title of the panel. */
    Title = "";
    /** Visualizer: The visualizer in-use. */
    Visualizer;
    /** Container: The container for the side panel. */
    Container;
    /** Dataset: The codebook dataset of the visualizer. */
    get Dataset() {
        return this.Visualizer.Dataset;
    }
    /** Source: The source dataset of the visualizer. */
    get Source() {
        return this.Visualizer.Dataset.Source;
    }
    /** InfoPanel: The information panel for the visualization. */
    get InfoPanel() {
        return this.Visualizer.InfoPanel;
    }
    /** SidePanel: The side panel for the visualization. */
    get SidePanel() {
        return this.Visualizer.SidePanel;
    }
    /** Dialog: Dialog for the visualization. */
    get Dialog() {
        return this.Visualizer.Dialog;
    }
    /** Parameters: The parameters of the visualizer. */
    get Parameters() {
        return this.Visualizer.Parameters;
    }
    /** Graph: The current graph of the visualizer. */
    GetGraph() {
        return this.Visualizer.GetStatus().Graph;
    }
    /** Constructor: Constructing the side panel. */
    constructor(Container, Visualizer) {
        this.Visualizer = Visualizer;
        this.Container = Container;
    }
    /** Show: Show the panel. */
    Show() {
        this.Container.show();
        this.Render();
    }
    /** Hide: Hide the panel. */
    Hide() {
        this.Container.hide();
    }
    /** Toggle: Toggle the panel. */
    Toggle() {
        this.Container.toggle();
    }
    /** Render: Render the panel. */
    Render() {
        this.Refresh();
    }
    /** Refresh: The current program that actually renders the panel. Optional. */
    Refresh = () => { };
    /** SetRefresh: Set the refresh function for the panel. */
    SetRefresh(Refresh) {
        this.Refresh = Refresh;
        Refresh();
    }
    /** BuildTable: Build a table for the panel. */
    BuildTable(Data, Builder, Columns = []) {
        var Table = $(`<table class="data-table"></table>`).appendTo(this.Container);
        if (Columns.length > 0)
            Table.append($(`<tr></tr>`).append(...Columns.map((C) => $(`<th></th>`).text(C))));
        Data.forEach((Item, Index) => Builder($(`<tr></tr>`).appendTo(Table), Item, Index));
        return Table;
    }
    /** BuildList: Build a list for the panel. */
    BuildList(Data, Builder, Type = "ul") {
        var List = $(`<${Type}></${Type}>`).appendTo(this.Container);
        Data.forEach((Item, Index) => Builder($(`<li></li>`).appendTo(List), Item, Index));
        return List;
    }
    /** BuildReturn: Build a return button. */
    BuildReturn(Callback) {
        return $(`<a href="javascript:void(0)">↑</a>`).on("click", Callback);
    }
}
