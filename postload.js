if (typeof (SiebelAppFacade.Postload) == "undefined") {
    Namespace('SiebelAppFacade.Postload');

    (function () {
        SiebelApp.EventManager.addListner("postload", OnPostload, this);
        function OnPostload() {
            try {
                //console.log("Loaded");
            }
            catch (error) {
                //No-Op
            }
        }
    }());
}

//EDUCATIONAL SAMPLE!!! DO NOT USE IN PRODUCTION!!!
//copy below code to vanilla postload.js

//globals
var bcrm_meta = {};
var defs = [];
var dt = [];

//get data from custom BO for Web Tools display of who else is editing an object definition
BCRMWSGetModData = function (cell) {
    bcrm_meta = {};
    bcrm_meta.wot = $(cell).attr("wot");
    bcrm_meta.wrn = $(cell).attr("wrn");
    var cl = $(cell);

    //get only Edit-In-Progress workspaces
    var url = location.origin + "/siebel/v1.0/data/BCRM Modified Object/BCRM Modified Object" + "?uniformresponse=Y&searchspec=" + "[Object Name]=\"" + bcrm_meta.wrn + "\" AND [Workspace Editable Flag]='Y' AND [Object Type]=\"" + bcrm_meta.wot + "\"";
    var settings = {
        "url": url,
        "method": "GET",
        "timeout": 0,
        "headers": {
            //"Authorization": "Basic U0FETUlOOlNpZWJlbDE5"
        },
    };

    $.ajax(settings).done(function (response) {
        //console.log(response);
        cl.find(".bcrm-dev-avatar").remove();
        for (var i = 0; i < response.items.length; i++) {
            //create "avatar" icon with tool tip for each entry
            var ava = $("<div class='bcrm-dev-avatar' style='color:white;width:15px;height:15px;background:orange;border-radius:50%;line-height:15px;float:left;margin-right:2px'>");
            ava.attr("title", response.items[i]["User Name"] + " is editing in " + response.items[i]["Workspace Name"] + "/" + response.items[i]["Workspace Version"]);
            ava.text(response.items[i]["User Name"].substring(0, 1));
            cl.append(ava);
            cl.attr("style", "background:coral!important;text-align:center;");
        }
    });
}

//get list of workspaces via REST
BCRMGetWorkspaceList = function () {
    var pagesize = 100;
    var url = location.origin + "/siebel/v1.0/data/BCRM%20Modified%20Object/BCRM%20Modified%20Object?uniformresponse=Y&childlinks=none&fields=Workspace%20Name,%20Workspace%20Version,Workspace%20Latest%20Version,Workspace%20Status,%20Object%20Name&PageSize=" + pagesize;
    var items = [];
    var ws = {};
    var wsn, wsv, wss;
    var cd = $.ajax({
        dataType: "json",
        url: url,
        async: false
    });
    if (typeof (cd.responseJSON.items) !== "undefined") {
        items = cd.responseJSON.items;
        for (var i = 0; i < items.length; i++) {
            wsn = items[i]["Workspace Name"];
            wsv = items[i]["Workspace Version"];
            wss = items[i]["Workspace Status"];
            wsl = items[i]["Workspace Latest Version"];
            if (typeof (ws[wsn]) === "undefined") {
                ws[wsn] = {};
            }
            if (typeof (ws[wsn]["Versions"]) === "undefined") {
                ws[wsn]["Versions"] = [];
            }
            if (ws[wsn]["Versions"].indexOf(wsv) == -1) {
                ws[wsn]["Versions"].push(wsv);
            }
            if (typeof (ws[wsn]["Status"]) === "undefined") {
                ws[wsn]["Status"] = wss;
            }
            if (typeof (ws[wsn]["Latest"]) === "undefined") {
                ws[wsn]["Latest"] = wsl;
            }
        }
    }
    return ws;
}

//create Workspace banner
BCRMWSGenerateWSBanner = function (ws, ver, status, type) {
    if (typeof (type) === "undefined") {
        type = "banner";
    }
    var u, w, v, s;
    var c = $('<div id="bcrm_wsui_name" class="siebui-active-ws" style="margin-right: 4px;background:transparent!important;"></div>');
    if (type == "banner") {
        u = $('<ul class="siebui-wsui-ctx-bar">');
    }
    else {
        u = $('<div class="siebui-wsui-ctx-bar">');
    }

    var cl = "";
    var st = "";
    switch (status) {
        case "Created": cl = "siebui-wsui-created"; st = "Writable"; break;
        case "Edit-In-Progress": cl = "siebui-wsui-edit-in-progress"; st = "Writable"; break;
        case "Delivered": cl = "siebui-wsui-delivered"; st = "Read-Only"; break;
        case "Checkpointed": cl = "siebui-wsui-checkpointed"; st = "Writable"; break;
        case "Submitted for Delivery": cl = "siebui-wsui-submitted-for-delivery"; st = "Read-Only"; break;
        default: cl = "siebui-wsui-delivered"; st = "Read-Only"; break;
    }
    if (ws == "MAIN") {
        st = "Read-Only";
    }
    if (type == "banner") {
        w = $('<li class="siebui-wsui-ctx-wsname"><span class="siebui-label">Workspace:</span> <span class="siebui-value">' + ws + '</span></li>');
        v = $('<li class="siebui-wsui-ctx-wsver"><span class="siebui-label">Version:</span> <span class="siebui-value">' + ver + '</span></li>');
        s = $('<li class="siebui-wsui-ctx-wsstatus"><span class="siebui-label">Status:</span> <span class="siebui-value">' + st + '</span></li>');
    }
    else {
        w = $('<div class="siebui-wsui-ctx-wsname"><span class="siebui-label">Workspace:</span> <span class="siebui-value">' + ws + '</span></div>');
        s = $('<div class="siebui-wsui-ctx-wsstatus"><span class="siebui-label">Status:</span> <span class="siebui-value">' + st + '</span></div>');
    }

    u.addClass(cl);
    c.attr("title", status + " (" + st + ")");
    u.append(w);
    if (type == "banner") {
        u.append(v);
    }
    u.append(s);
    c.append(u);
    return c;
};

//Re-enact workspace banner in application until there's a better way
BCRMWSUpdateWSBanner = function (ws, ver, status) {
    $("div.applicationMenu").parent().find("#bcrm_wsui_name").remove();
    var c = BCRMWSGenerateWSBanner(ws, ver, status, "banner");
    $("div.applicationMenu").after(c);
};

//Open and inspect workspace
BCRMWSFastInspectHandler = function (cell) {
    bcrm_meta = {};
    bcrm_meta.wsn = $(cell).attr("wsn");
    bcrm_meta.wsv = $(cell).attr("wsv");
    bcrm_meta.wss = $(cell).attr("wss");
    BCRMWSFastInspect(bcrm_meta.wsn, bcrm_meta.wsv, bcrm_meta.wss);
};

//fast inspect main function (calls server side BS)
BCRMWSFastInspect = function (ws, ver, status) {
    var vn = SiebelApp.S_App.GetActiveView().GetName();
    var vreload = true;
    if (vn == "Business Service Test View") {
        vreload = false;
    }
    var tview = "User Profile Behavior View";
    var svc = SiebelApp.S_App.GetService("FWK Runtime");
    var ips = SiebelApp.S_App.NewPropertySet();
    var ops = SiebelApp.S_App.NewPropertySet();
    ips.SetProperty("WorkspaceName", ws);
    ips.SetProperty("WorkspaceVersion", ver);
    if (vreload) {
        SiebelApp.S_App.GotoView(tview);
    }

    setTimeout(function () {
        ops = svc.InvokeMethod("FastInspect", ips);

        if (ops.GetProperty("Status") == "OK") {
            //BCRMWSUpdateWSBanner(ws, ver, status);
            sessionStorage.BCRMCurrentWorkspace = ws;
            sessionStorage.BCRMCurrentWorkspaceVersion = ver;
            sessionStorage.BCRMCurrentWorkspaceStatus = status;
            if (vreload) {
                SiebelApp.S_App.GotoView(vn);
            }
            else {
                location.reload();
            }
            BCRMWSUpdateWSBanner(ws, ver, status);
        }
    }, 300);
};

//read workspace data for modified object list applet
BCRMWSGetObjectDef = function (cell) {
    bcrm_meta = {};
    bcrm_meta.wot = $(cell).attr("wot");
    bcrm_meta.wsn = $(cell).attr("wsn");
    bcrm_meta.wsv = $(cell).attr("wsv");
    bcrm_meta.wrn = $(cell).attr("wrn");

    //need to get workspace/version data for given object
    var url = location.origin + "/siebel/v1.0/workspace/*/" + bcrm_meta.wot + "/*?workspace=" + bcrm_meta.wsn + "&version=" + bcrm_meta.wsv + "&searchspec=[Name]=\"" + bcrm_meta.wrn + "\"";
    var settings = {
        "url": url,
        "method": "GET",
        "timeout": 0,
        "headers": {
            //"Authorization": "Basic U0FETUlOOlNpZWJlbDE5"
        },
    };

    $.ajax(settings).done(function (response) {
        //repair response links
        //expansion example
        var temp = response;
        for (var i = 0; i < temp.Link.length; i++) {
            if (temp.Link[i].rel == "child") {
                var href = temp.Link[i].href;
                href += "/?uniformresponse=Y&workspace=" + bcrm_meta.wsn + "&version=" + bcrm_meta.wsv;
                temp.Link[i].href = href;

                //DRAFT: expansion example for applet controls and bs server scripts
                if ((bcrm_meta.wot == "Applet" && temp.Link[i].name == "Control") || (bcrm_meta.wot == "Business Service" && temp.Link[i].name == "Business Service Server Script")) {
                    var cd = $.ajax({
                        dataType: "json",
                        url: href,
                        async: false
                    });
                    if (typeof (cd.responseJSON.items) !== "undefined") {
                        temp.Link[i].items = cd.responseJSON.items;
                    }
                }
            }
        }
        response = temp;

        //create simple dialog with codemirror (should be part of vanilla siebel)
        var value = JSON.stringify(response, null, 4);
        var dtitle = "<h3>" + bcrm_meta.wot + ":" + bcrm_meta.wrn + " [" + bcrm_meta.wsn + "/" + bcrm_meta.wsv + "]</h3>";
        var cm = $("<div id='bcrm_cm'>");
        defs.push(value);
        dt.push(dtitle);
        var dlg = $("<div style='overflow:auto;'>");
        dlg.append(dtitle);
        dlg.append(cm);

        dlg.dialog({
            title: "Object Metadata",
            width: 800,
            height: 600,
            close: function (e, ui) {
                $(this).dialog("destroy");
            }
        });
        setTimeout(function () {
            CodeMirror($("#bcrm_cm")[0], {
                value: value,
                mode: "json"
            });
        }, 100);

        //if the second item has been clicked, open a comparison window
        if (defs.length == 2) {
            BCRMCompare(defs.pop(), defs.pop());
        }
    });
};

//in this DRAFT(!!) we simply compare the last two defs that have been clicked
//requires mergely
BCRMCompare = function (right, left) {
    var wrap = $("<div id='bcrm_compare_wrapper'><div id='bcrm-compare-left-title' style='width:50%;float:left;'></div><div id='bcrm-compare-right-title' style='width:50%;float:left;'></div></div>");
    $("#compare2").remove();
    $("#_sweview").append(wrap);
    wrap.append("<div id='compare2'>");
    $("#bcrm-compare-right-title").html(dt.pop());
    $("#bcrm-compare-left-title").html(dt.pop());

    $("#compare2").mergely({
        cmsettings: {
            readOnly: false,
            lineWrapping: true
        },
        wrap_lines: true,

        //Doesn't do anything?
        autoresize: true,

        editor_width: 'calc(50% - 25px)',
        editor_height: '100%',

        lhs: function (setValue) {
            setValue(left);
        },
        rhs: function (setValue) {
            setValue(right);
        }
    });
};

//enhance modified objects list applet with clickable object name and WS/Version column
BCRMWSEnhancer = function (pm) {
    if (typeof (pm) === "undefined") {
        pm = this;
    }
    if (pm && pm.Get) {
        var row, fid, ph, rs, ae, cell, od, wsmsg;
        row = 0;
        fid = pm.Get("GetFullId");
        ph = pm.Get("GetPlaceholder");
        ae = $("#s_" + fid + "_div");
        rs = pm.Get("GetRawRecordSet");
        for (r in rs) {
            od = {};
            row = parseInt(r) + 1;
            od.wot = rs[r]["Object Type"];
            od.wrn = rs[r]["Object Name"];
            od.wsn = rs[r]["Workspace Name"];
            od.wsv = rs[r]["Workspace Version"];
            od.wss = rs[r]["Workspace Status"];

            cell = ae.find("td[id='" + row + "_" + ph + "_Object_Name']");

            cell.off("click");
            cell.attr(od);
            cell.on("click", function () {
                BCRMWSGetObjectDef(this);
            });
            cell.attr("bcrm-enhanced", "true");
            cell.css("color", "blue");
            cell.css("cursor", "pointer");
            cell.attr("title", "Click to view repository metadata for " + od.wot + " : " + od.wrn);

            cell = ae.find("td[id='" + row + "_" + ph + "_Workspace_Name']");

            cell.off("dblclick");
            cell.attr(od);
            cell.on("dblclick", function () {
                BCRMWSFastInspectHandler(this);
            });
            cell.attr("bcrm-enhanced", "true");
            cell.css("color", "darkgreen");
            cell.css("cursor", "zoom-in");
            wsmsg = od.wsn + "/" + od.wsv + " (" + od.wss + ")";
            cell.attr("title", "Double-click to Open and Inspect Workspace " + wsmsg);
        }
    }
};

//add click handler to "Writable" column
BCRMWebToolsHighlight = function (pm) {
    if (typeof (pm) === "undefined") {
        pm = this;
    }
    if (pm && pm.Get) {
        //get Object Type from Object Explorer
        var ot = $(".siebui-wt-objexp-tree").find(".fancytree-active").text();

        var rown, row, fid, ph, rs, ae, cell, od;
        rown = 0;
        fid = pm.Get("GetFullId");
        ph = pm.Get("GetPlaceholder");
        ae = $("#s_" + fid + "_div");
        rs = pm.Get("GetRawRecordSet");
        for (r in rs) {
            od = {};
            rown = parseInt(r) + 1;
            od.wot = ot;
            od.wrn = rs[r]["Name"];
            row = ae.find("tr[id='" + rown + "']");
            cell = row.find("td[id='" + rown + "_" + ph + "_Writable']");
            cell.off("click");
            cell.attr(od);
            row.on("click", function () {
                var rown = $(this).attr("id");
                var ph = $(this).parent().parent().attr("id");
                var cell = $(this).find("td[id='" + rown + "_" + ph + "_Writable']");
                BCRMWSGetModData(cell);
            });
            cell.css("cursor", "pointer");
        }
    }
};

//DRAFT and unsupported: Enhance tools list applet
BCRMWebToolsEnhancer = function () {
    //DRAFT: grab the main list applet
    var pm = SiebelApp.S_App.GetActiveView().GetActiveApplet().GetPModel();
    pm.AttachPMBinding("ShowSelection", BCRMWebToolsHighlight, { scope: pm, sequence: true });
    BCRMWebToolsHighlight(pm);
};

//Create Workspace Menu
BCRMCreateWSMenu = function (data) {
    var key, val, wsn, wss, wsl, ver;
    var ul_main = $("<ul ul style='width:min-content;text-align:left;background:whitesmoke;' class='depth-0'></ul>");
    for (d in data) {
        wsn = d;
        wss = data[d]["Status"];
        wsl = data[d]["Latest"];
        ver = data[d]["Versions"];
        //val = data[d];
        var li = $("<li class='bcrm-li' wss='" + wss + "' wsv='" + wsl + "' wsn='" + wsn + "' style='cursor:pointer;float:left;margin-right:200px;margin-left:4px;margin-bottom:2px;'></li>");
        var dv = BCRMWSGenerateWSBanner(wsn, wsl, wss, "menu");
        li.append(dv);
        var ul = $("<ul class='depth-1' style='width: min-content;text-align: left;'>");
        for (var i = 0; i < ver.length; i++) {
            key = ver[i];
            var lisub = $("<li class='bcrm-lisub' style='cursor:pointer;background: grey;width: 24px;height: 24px;margin: 4px;line-height: 1.7;text-align: center;font-size: 1.2em; padding: 1px; border-radius: 4px;' wsv='" + key + "' wsn='" + wsn + "' wss='" + wss + "'><div style='padding-left:4px;color:white'>" + key + "</div></li>");
            ul.append(lisub);
        }
        ul.appendTo(li);
        li.appendTo(ul_main);
    }
    ul_main.find("li.bcrm-lisub").on("click", function () {
        BCRMWSFastInspect($(this).attr("wsn"), $(this).attr("wsv"), $(this).attr("wss"));
        $("#bcrm_ws_menu").remove();
    });
    ul_main.find("li.bcrm-li").on("click", function () {
        BCRMWSFastInspect($(this).attr("wsn"), $(this).attr("wsv"), $(this).attr("wss"));
        $("#bcrm_ws_menu").remove();
    });
    return ul_main;
};

//Create Debugger Menu
BCRMCreateDebugMenu = function () {
    var items = {
        "ShowBCFields": {
            "label": "Show BC Fields",
            "title": "Toggle Form and List Applets to display BC Field information in labels",
            "onclick": function () {
                var am = SiebelApp.S_App.GetActiveView().GetAppletMap();
                var ut = new SiebelAppFacade.BCRMUtils();
                for (a in am) {
                    ut.ShowBCFields(a);
                }
                sessionStorage.BCRMToggleCycle = "ShowBCFields";
                $("#bcrm_dbg_menu").find("ul.depth-0").menu("destroy");
            }
        },
        "ShowTableColumns": {
            "label": "Show Tables/Columns",
            "title": "Toggle Form and List Applets to display physical layer information",
            "onclick": function () {
                var am = SiebelApp.S_App.GetActiveView().GetAppletMap();
                var ut = new SiebelAppFacade.BCRMUtils();
                for (a in am) {
                    ut.ShowTableColumns(a);
                }
                sessionStorage.BCRMToggleCycle = "ShowTableColumns";
                $("#bcrm_dbg_menu").find("ul.depth-0").menu("destroy");
            }
        },
        "Reset": {
            "label": "Reset Labels",
            "title": "Toggle Form and List Applets to display original labels",
            "onclick": function () {
                var am = SiebelApp.S_App.GetActiveView().GetAppletMap();
                var ut = new SiebelAppFacade.BCRMUtils();
                for (a in am) {
                    ut.LabelReset(a);
                }
                sessionStorage.BCRMToggleCycle = "Reset";
                $("#bcrm_dbg_menu").find("ul.depth-0").menu("destroy");
            }
        },
        "StartTracing": {
            "label": "Start Tracing",
            "title": "Start SQL/Allocation Tracing",
            "onclick": function () {
                BCRMStartLogging();
                sessionStorage.BCRMTracingCycle = "StartTracing";
                $("#bcrm_dbg_menu").find("ul.depth-0").menu("destroy");
                $("#bcrm_debug_msg").text("SQL tracing in progress.");
            }
        },
        "ViewTracing": {
            "label": "View Trace File",
            "title": "View SQL/Allocation Trace File",
            "onclick": function () {
                BCRMViewLog();
                $("#bcrm_dbg_menu").find("ul.depth-0").menu("destroy");
            }
        },
        "StopTracing": {
            "label": "Stop Tracing",
            "title": "Stop SQL/Allocation Tracing",
            "onclick": function () {
                BCRMStopLogging();
                sessionStorage.BCRMTracingCycle = "StopTracing";
                $("#bcrm_dbg_menu").find("ul.depth-0").menu("destroy");
                $("#bcrm_debug_msg").text("");
            }
        },
        "GotoView1": {
            "label": "Go to Modified Objects View",
            "title": "View and compare object definitions (DR Only)",
            "onclick": function () {
                $("#bcrm_dbg_menu").find("ul.depth-0").menu("destroy");
                SiebelApp.S_App.GotoView("BCRM Modified Objects List View");
            }
        },
        "ClearCaches": {
            "label": "Clear Caches",
            "title": "Clear RTE, LOV and Responsibility Cache",
            "onclick": function () {
                $("#bcrm_dbg_menu").find("ul.depth-0").menu("destroy");
                BCRMClearCaches();
            }
        },
        "AboutView": {
            "label": "About View",
            "title": "Same, but on steroids ;-)",
            "onclick": function () {
                $("#bcrm_dbg_menu").find("ul.depth-0").menu("destroy");
                BCRMSiebelAboutView();
            }
        },
        "ScriptEditor": {
            "label": "eScript Editor",
            "title": "Test eScript from the comfort of your browser",
            "onclick": function () {
                $("#bcrm_dbg_menu").find("ul.depth-0").menu("destroy");
                BCRMScriptEditor();
            }
        }
    };
    var ul_main = $("<ul ul style='width: auto;text-align:left;background:#29303f;' class='depth-0'></ul>");
    for (i in items) {
        var li = $("<li class='bcrm-dbg-item' id='" + i + "' style='margin-right:4px;margin-left:4px;margin-bottom:2px;'></li>");
        var dv = $("<div title='" + items[i].title + "'>" + items[i].label + "</div>");
        if (sessionStorage.BCRMToggleCycle == i || sessionStorage.BCRMTracingCycle == i) {
            dv.addClass("ui-state-disabled");
        }
        else if (typeof (sessionStorage.BCRMToggleCycle) === "undefined" && i == "Reset") {
            dv.addClass("ui-state-disabled");
        }
        else if (typeof (sessionStorage.BCRMTracingCycle) === "undefined" && i == "StopTracing") {
            dv.addClass("ui-state-disabled");
        }
        else {
            dv.on("click", items[i].onclick);
        }
        li.append(dv);
        li.appendTo(ul_main);
    }
    return ul_main;
};

//Add debug button
BCRMAddDebugButton = function () {
    if ($("#bcrm_debug").length == 0) {
        var btn = $('<div id="bcrm_debug" class="siebui-banner-btn siebui-toolbar-toggle-script-debugger"><ul class="siebui-toolbar"><li class="siebui-toolbar-enable" role="menuitem" title="Debug Options"><span class="siebui-icon-tb-toggle_script_debugger ToolbarButtonOn"><span class="siebui-toolbar-text">BCRM Debugger</span></span></li></ul></div>');
        if ($("#SiebComposerConfig").length == 1) {
            $("#SiebComposerConfig").parent().before(btn);
        }
        $(btn.find("li")[0]).on("click", function (e) {
            if ($("#bcrm_dbg_menu").length == 0) {
                var mc = $("<div id='bcrm_dbg_menu'></div>");
                var menu = BCRMCreateDebugMenu();
                mc.append(menu);
                $(this).prepend(mc);
                $("#bcrm_dbg_menu").find("ul.depth-0").menu({
                    position: { my: "left top", at: "right-5 top+5" }
                });
            }
            else {
                //$("#bcrm_dbg_menu").find("ul.depth-0").menu("destroy");
                $("#bcrm_dbg_menu").remove();
            }
        });
    }
    //add message area
    if ($("#bcrm_debug_msg").length == 0) {
        var ms = $('<div id="bcrm_debug_msg" style="float: left;margin-top: 10px;padding-left: 20px;color: lightsteelblue;width: fit-content;">');
        $(".applicationMenu").after(ms);
        $("#bcrm_debug_msg").text("BCRM devpops loaded. Let's crush some bugs!");
        setTimeout(function () {
            $("#bcrm_debug_msg").text("");
        }, 5000);
    }
};

//Right-click on Dashboard icon (cube)
BCRMWSIconEnhancer = function () {
    if ($("#SiebComposerConfig").length == 1) {
        $("#SiebComposerConfig").attr("style", "transition: background-color 1.5s ease-in-out 1s;");
        $("#SiebComposerConfig").attr("style", "transition: background-color 1.5s ease-in-out 1s;background-color: mediumseagreen;");
        setTimeout(function () {
            $("#SiebComposerConfig").attr("style", "transition: background-color 1.5s ease-in-out 1s;");
        }, 5000);
        if ($("#SiebComposerConfig").attr("bcrm-enhanced") != "true") {
            $("#SiebComposerConfig").attr("bcrm-enhanced", "true");

            $("#SiebComposerConfig").attr("title", "Right-click to see menu of recent workspaces and versions for fast inspection");
            $("#SiebComposerConfig").on("contextmenu", function (e) {
                var ws = BCRMGetWorkspaceList();
                if ($("#bcrm_ws_menu").length == 0) {
                    var mc = $("<div id='bcrm_ws_menu'></div>");
                    var menu = BCRMCreateWSMenu(ws);
                    mc.append(menu);
                    //$("#_sweclient").append(mc);
                    $($("#SiebComposerConfig").find("div")[0]).after(mc);
                    $("#bcrm_ws_menu").find("ul.depth-0").menu({
                        position: { my: "left top", at: "right-5 top+5" }
                    });
                }
                else {
                    $("#bcrm_ws_menu").remove();
                }
                return false;
            });
        }
    }
};

//courtesy of Jason MacZura: view trace file in browser
BCRMViewLog = function () {
    var jm_myOutput = "";
    var jm_service = SiebelApp.S_App.GetService("FWK Runtime");
    var jm_ps = SiebelApp.S_App.NewPropertySet();
    jm_ps.SetProperty("Operation", "ViewLog");
    jm_ps.SetProperty("RetainFile", "false");
    jm_ps.SetProperty("FilePath", "C:\\Siebel\\ses\\siebsrvr\\temp");
    var jm_outps = jm_service.InvokeMethod("ProcessLogRequest", jm_ps);

    if (jm_outps.GetChildByType("ResultSet") != null && jm_outps.GetChildByType("ResultSet") != "undefined") {
        jm_myOutput = jm_outps.GetChildByType("ResultSet").GetProperty("myOutput");

    }

    $("#developer_log").remove();
    $("body").append('<div id="developer_log"' + jm_myOutput + '</div>');
    var value = $("#developer_log").text();
    $("#developer_log").remove();
    var dtitle = "<h3>" + "SQL Trace" + "</h3>";
    var cm = $("<div id='bcrm_cm' style='height:400px;'>");
    var dlg = $("<div style='overflow:auto;'>");
    dlg.append(dtitle);
    dlg.append(cm);

    //ahansal added support for codemirror
    dlg.dialog({
        title: "Trace File Viewer",
        width: 1300,
        height: 600,
        modal: false,
        draggable: true,
        autoOpen: true,
        overflow: scroll,
        resizable: true,
        buttons: {
            Close: function (e, ui) {
                $(this).dialog("destroy");
            },
            Copy: function () {
                $(this).focus();
                var tempta = $("<textarea id='bcrm_temp_ta'>");
                tempta.val(value);
                tempta.appendTo("body");
                tempta.focus();
                tempta[0].select();
                document.execCommand('copy');
                tempta.remove();
            }
        }

    });
    setTimeout(function () {
        CodeMirror($("#bcrm_cm")[0], {
            value: value,
            mode: "sql"
        });
    }, 100);
};

//courtesy of Jason MacZura: start tracing from browser
BCRMStartLogging = function () {
    var jm_service = SiebelApp.S_App.GetService("FWK Runtime");
    var jm_ps = SiebelApp.S_App.NewPropertySet();
    jm_ps.SetProperty("FilePath", "C:\\Siebel\\ses\\siebsrvr\\temp");
    jm_ps.SetProperty("Operation", "StartLogging");
    var jm_outps = jm_service.InvokeMethod("ProcessLogRequest", jm_ps);
    var jm_myOutput = "";

    if (jm_outps.GetChildByType("ResultSet") != null && jm_outps.GetChildByType("ResultSet") != "undefined") {
        jm_myOutput = jm_outps.GetChildByType("ResultSet").GetProperty("Status");
    }

    $(function () {

        if ($('#developer_log').length > 0) {
            $('#developer_log').remove();
        }
        $("body").append('<div id="developer_log" style="background-color:#BDD3F0";>' + jm_myOutput + '</div>');
        /*
        $("#developer_log").dialog({
            modal: true,
            buttons: {
                Ok: function () {
                    $(this).dialog("destroy");
                }
            }
        });
        */
    });
};

//simple extension to write messages into trace file
BCRMTrace = function (msg) {
    var jm_service = SiebelApp.S_App.GetService("FWK Runtime");
    var jm_ps = SiebelApp.S_App.NewPropertySet();
    jm_ps.SetProperty("Operation", "Trace");
    jm_ps.SetProperty("TraceMsg", msg);
    var jm_outps = jm_service.InvokeMethod("ProcessLogRequest", jm_ps);
};

//courtesy of Jason MacZura: stop tracing
BCRMStopLogging = function () {

    const jm_service = SiebelApp.S_App.GetService("FWK Runtime");
    var jm_ps = SiebelApp.S_App.NewPropertySet();

    jm_ps.SetProperty("Operation", "StopLogging");
    var jm_outps = jm_service.InvokeMethod("ProcessLogRequest", jm_ps);
    var jm_myOutput = "";

    if (jm_outps.GetChildByType("ResultSet") != null && jm_outps.GetChildByType("ResultSet") != "undefined") {
        jm_myOutput = jm_outps.GetChildByType("ResultSet").GetProperty("Status");
    }

    $(function () {

        if ($('#developer_log').length > 0) {
            $('#developer_log').remove();
        }

        $("body").append('<div id="developer_log" style="background-color:#BDD3F0";>' + jm_myOutput + '</div>');
        /*
        $("#developer_log").dialog({
            modal: true,
            buttons: {
                Ok: function () {
                    $(this).dialog("destroy");
                }
            }
        });
        */
    });
};

//Kudos to Slava (xapuk.com)
BCRMClearCaches = function () {
    var a = SiebelApp.S_App.GetActiveView().GetActiveApplet();
    a.InvokeMethod("ClearCTEventCache");
    a.InvokeMethod("ClearLOVCache");
    a.InvokeMethod("ClearResponsibilityCache");
    alert("Caches cleared:\nRuntime Events\nLOVs\nResponsibility");
};


//called on postload
BCRMWSHelper = function () {
    try {
        var vn = SiebelApp.S_App.GetActiveView().GetName();
        var an = "BCRM Modified Objects List Applet";
        var am = SiebelApp.S_App.GetActiveView().GetAppletMap();
        var ut = new SiebelAppFacade.BCRMUtils();
        var pm;
        //enhance view
        if (vn == "BCRM Modified Objects List View") {
            //import mergely
            var css = $("<link type='text/css' href='https://cdn.rawgit.com/wickedest/Mergely/3.4.0/lib/mergely.css' rel='stylesheet'>");
            var jdp = $("<script type='text/javascript' src='https://cdn.rawgit.com/wickedest/Mergely/3.4.1/lib/mergely.js'></script>");

            if ($("script[src*='mergely']").length == 0) {
                $("head").append(jdp);
                $("head").append(css);
            }

            pm = SiebelApp.S_App.GetActiveView().GetApplet(an).GetPModel();
            pm.AttachPMBinding("ShowSelection", BCRMWSEnhancer, { scope: pm, sequence: true });
            BCRMWSEnhancer(pm);
        }

        //enhance Web Tools
        if (SiebelApp.S_App.GetAppName() == "Siebel Web Tools") {
            BCRMWebToolsEnhancer();
        }

        //enhance application
        if (SiebelApp.S_App.GetAppName() != "Siebel Web Tools") {
            //add right click handler to Dashboard icon
            BCRMWSIconEnhancer();

            //add debug button
            BCRMAddDebugButton();

            //show current workspace
            if (typeof (sessionStorage.BCRMCurrentWorkspace) !== "undefined") {
                BCRMWSUpdateWSBanner(sessionStorage.BCRMCurrentWorkspace, sessionStorage.BCRMCurrentWorkspaceVersion, sessionStorage.BCRMCurrentWorkspaceStatus);
            }

            //xray handler
            for (a in am) {
                ut.AddXrayHandler(a);
            }
        }

    }
    catch (e) {
        console.log("Error in BCRMWSHelper: " + e.toString());
    }
};

SiebelApp.EventManager.addListner("postload", BCRMWSHelper, this);

//everything below this line should go into a separate utility file
//Util collection for XRAY 21
if (typeof (SiebelAppFacade.BCRMUtils) === "undefined") {
    SiebelJS.Namespace("SiebelAppFacade.BCRMUtils");

    SiebelAppFacade.BCRMUtils = (function () {
        function BCRMUtils(options) { }

        //xray handler: defines trigger event
        BCRMUtils.prototype.AddXrayHandler = function (context) {
            var ut = new SiebelAppFacade.BCRMUtils();
            var pm = ut.ValidateContext(context);
            var tp = "";
            var ae;
            if (pm) {
                tp = ut.GetAppletType(pm);
                if (tp == "form" || tp == "list") {
                    ae = ut.GetAppletElem(pm);
                    ae.dblclick(function () //jQuery double-click event handler
                    {
                        var cycle; //the toggle cycle
                        switch (pm.Get("C_ToggleCycle")) {
                            case "ShowBCFields": cycle = "ShowTableColumns";
                                break;
                            case "ShowTableColumns": cycle = "Reset";
                                break;
                            case "Reset": cycle = "ShowBCFields";
                                break;
                            default: cycle = "ShowBCFields";
                                break;
                        }
                        pm.SetProperty("C_ToggleCycle", cycle); //set property to current cycle
                        ut.ToggleLabels(cycle, pm); //call utility method
                        //console.log(cycle);
                    });
                }
            }
        };

        //toggle labels main function
        BCRMUtils.prototype.ToggleLabels = function (cycle, context) {
            var ut = new SiebelAppFacade.BCRMUtils();
            var pm = ut.ValidateContext(context);
            if (pm) {
                switch (cycle) //determine current toggle cycle and spawn functions
                {
                    case "ShowBCFields": ut.ShowBCFields(pm);
                        break;
                    //only simple physical metatdata as of yet,
                    case "ShowTableColumns": ut.ShowTableColumns(pm);
                        break;
                    case "Reset": ut.LabelReset(pm);
                        break;
                    default: ut.ShowBCFields(pm);
                        break;
                }
            }
        };

        //reset to original labels
        BCRMUtils.prototype.LabelReset = function (context) {
            var ut = new SiebelAppFacade.BCRMUtils();
            var pm = ut.ValidateContext(context);
            var tp, cs, le;
            if (pm) {
                tp = ut.GetAppletType(pm);
                if (tp == "form" || tp == "list") {
                    cs = pm.Get("GetControls");
                    for (c in cs) {
                        if (cs.hasOwnProperty(c)) {
                            le = ut.GetLabelElem(cs[c], pm);
                            //look for "custom" labels
                            if (le && le.attr("bcrm-custom-label") == "true") {
                                ut.SetLabel(cs[c], cs[c].GetDisplayName(), pm);
                            }
                        }
                    }
                }
            }
        };

        //set label for a control
        BCRMUtils.prototype.SetLabel = function (c, nl, context) {
            var ut = new SiebelAppFacade.BCRMUtils();
            var pm = ut.ValidateContext(context);
            var le;
            if (pm) {
                le = ut.GetLabelElem(c, pm);
                if (le) {
                    le.text(nl);
                    //mark label as changed
                    le.attr("bcrm-custom-label", "true");
                }
            }
        };

        //get label element for a control
        BCRMUtils.prototype.GetLabelElem = function (c, context) {
            var ut = new SiebelAppFacade.BCRMUtils();
            var pm = ut.ValidateContext(context);
            var tp;
            var pr, ce, li, ae, inpname, gh, ph, ch, cm, fn, cn;
            var thelabel;
            var retval = null;
            if (pm) {
                tp = ut.GetAppletType(pm);
                pr = pm.GetRenderer();
                ae = ut.GetAppletElem(pm);
                if (tp == "form" && pr.GetUIWrapper(c)) {
                    //get control element
                    ce = pr.GetUIWrapper(c).GetEl();
                    inpname = c.GetInputName();
                    //first attempt: get by label id
                    li = $(ce).attr("aria-labelledby");

                    //first attempt
                    //20.10 or higher have applet id appended to label
                    //use "begins with" logic seems to do the trick
                    //needs more testing
                    thelabel = ae.find("span[id^='" + li + "']");

                    //alternative:re-create label id using applet id

                    //second attempt: try with text
                    if (thelabel.length == 0) {
                        li = $(ce).attr("aria-label");
                        ae.find("span:contains('" + li + "')").each(function (x) {
                            if ($(this).text() == li) {
                                thelabel = $(this);
                            }
                        })
                    }

                    //third attempt: use tag from previous runs
                    if (thelabel.length == 0) {
                        li = inpname;
                        thelabel = ae.find("[bcrm-label-for='" + li + "']");
                    }

                    //check if label has been found
                    if (thelabel.length == 1) {
                        //tag the label
                        thelabel.attr("bcrm-label-for", inpname);
                        retval = thelabel;
                    }
                }
                if (tp == "list" && typeof (c) !== "undefined") {
                    gh = ae.find("table.ui-jqgrid-htable");
                    ph = pm.Get("GetPlaceholder");
                    ch = pr.GetColumnHelper();
                    cm = ch.GetColMap();
                    fn = c.GetName();
                    for (col in cm) {
                        if (cm[col] == fn) {
                            cn = col;
                        }
                    }
                    li = "div#jqgh_" + ph + "_" + cn;
                    thelabel = gh.find(li);
                    if (thelabel.length == 1) {
                        retval = thelabel;
                    }
                }
                return retval;
            }
        }
        //show BC Field information on labels
        BCRMUtils.prototype.ShowBCFields = function (context) {
            var ut = new SiebelAppFacade.BCRMUtils();
            var pm = ut.ValidateContext(context);
            var bc, fm, cs, tp, fn, fd;
            var fdt, fln, fcl, frq;
            var nl;
            if (pm) {
                bc = pm.Get("GetBusComp");
                fm = bc.GetFieldMap();
                tp = ut.GetAppletType(pm);
                //Form Applet treatment
                if (tp == "form" || tp == "list") {
                    cs = pm.Get("GetControls");
                    for (c in cs) {
                        if (cs.hasOwnProperty(c)) {
                            fn = cs[c].GetFieldName();
                            if (fn != "") {
                                fd = fm[fn];
                                fdt = fd.GetDataType(); //get the data type (text, bool, etc)
                                fln = fd.GetLength(); //get the field length (30, 100, etc)
                                frq = fd.IsRequired() ? "*" : ""; //get an asterisk when field is required, otherwise nothing
                                fcl = fd.IsCalc() ? "C" : ""; //get a "C" when field is calculated, otherwise nothing
                                nl = fn + " (" + fdt + "/" + fln + ")" + frq + fcl;
                                ut.SetLabel(cs[c], nl, pm);
                            }
                        }
                    }
                }
            }
        }

        //Wrapper for BCRM RR Reader service
        BCRMUtils.prototype.GetRRData = function (ot, on) {
            var svc = SiebelApp.S_App.GetService("FWK Runtime");
            var ips = SiebelApp.S_App.NewPropertySet();
            var ops;
            var data;
            ips.SetProperty("Object Type", ot);
            ips.SetProperty("Object Name", on);
            ops = svc.InvokeMethod("GetRRData", ips);
            if (ops.GetProperty("Status") == "OK") {
                data = ops.GetChildByType("ResultSet");
            }
            return data;
        };

        //extract specified data (BC only as of now, but could expand)
        BCRMUtils.prototype.ExtractBCData = function (rrdata) {
            var retval = {};
            var bc;
            var props;
            var pc;
            var cc;
            var fn;
            retval["Business Component"] = {};
            bc = retval["Business Component"];
            props = rrdata.GetChild(0).GetChildByType("Properties").propArray;
            pc = props.length;
            for (p in props) {
                bc[p] = props[p];
            }
            bc["Fields"] = {};
            bc["Joins"] = {};
            bc["Multi Value Links"] = {};
            cc = rrdata.GetChild(0).childArray;
            for (c in cc) {
                if (cc[c].type == "Field") {
                    props = cc[c].GetChildByType("Properties").propArray;
                    fn = cc[c].GetChildByType("Properties").propArray["Name"];
                    bc["Fields"][fn] = {};
                    for (p in props) {
                        bc["Fields"][fn][p] = props[p];
                    }
                }
                if (cc[c].type == "Join") {
                    props = cc[c].GetChildByType("Properties").propArray;
                    fn = cc[c].GetChildByType("Properties").propArray["Name"];
                    bc["Joins"][fn] = {};
                    for (p in props) {
                        bc["Joins"][fn][p] = props[p];
                    }
                }
                if (cc[c].type == "Multi Value Link") {
                    props = cc[c].GetChildByType("Properties").propArray;
                    fn = cc[c].GetChildByType("Properties").propArray["Name"];
                    bc["Multi Value Links"][fn] = {};
                    for (p in props) {
                        bc["Multi Value Links"][fn][p] = props[p];
                    }
                }
            }
            return retval;
        };

        //wrapper to get "formatted" BC data
        BCRMUtils.prototype.GetBCData = function (bcn) {
            var ut = new SiebelAppFacade.BCRMUtils();
            var rrdata, bcdata, bcd;
            //use session storage as client-side cache to avoid multiple queries for the same object
            var cache = "BCRM_RR_CACHE_BC_" + bcn;
            if (!sessionStorage.getItem(cache)) {
                rrdata = ut.GetRRData("Buscomp", bcn);
                bcdata = ut.ExtractBCData(rrdata);
                bcd = bcdata["Business Component"];
                sessionStorage.setItem(cache, JSON.stringify(bcd));
            }
            else {
                bcd = JSON.parse(sessionStorage.getItem(cache));
            }
            return bcd;
        };

        //show physical metadata (table.column), requires BCRM RR Reader service
        BCRMUtils.prototype.ShowTableColumns = function (context) {
            var ut = new SiebelAppFacade.BCRMUtils();
            var pm = ut.ValidateContext(context);
            var table, column, mvlink, mvfield, mvbc, join;
            var bcd2;
            var bc, bcd, bcn, fm, cs, tp, fn, fd;
            var fdt, fln, fcl, frq;
            var nl;
            if (pm) {
                bc = pm.Get("GetBusComp");
                bcn = bc.GetName();
                //get RR CLOB Data from BCRM RR Reader service
                bcd = ut.GetBCData(bcn);
                fm = bc.GetFieldMap();
                tp = ut.GetAppletType(pm);

                if (tp == "form" || tp == "list") {
                    cs = pm.Get("GetControls");
                    for (c in cs) {
                        if (cs.hasOwnProperty(c) && c != "CleanEmptyElements") {
                            fn = cs[c].GetFieldName();
                            if (fn != "") {
                                fd = fm[fn];
                                fdt = fd.GetDataType(); //get the data type (text, bool, etc)
                                fln = fd.GetLength(); //get the field length (30, 100, etc)
                                frq = fd.IsRequired() ? "*" : ""; //get an asterisk when field is required, otherwise nothing
                                fcl = fd.IsCalc() ? "C" : ""; //get a "C" when field is calculated, otherwise nothing

                                if (typeof (bcd["Fields"][fn]) !== "undefined") {

                                    table = bcd["Table"];
                                    column = bcd["Fields"][fn]["Column"];

                                    //Join lookup
                                    if (bcd["Fields"][fn]["Join"] != "") {
                                        join = bcd["Fields"][fn]["Join"];
                                        if (typeof (bcd["Joins"][join]) !== "undefined") {
                                            table = bcd["Joins"][join]["Table"];
                                        }
                                        else {
                                            table = join;
                                        }
                                    }
                                    nl = table + "." + column;

                                    //calculated fields
                                    if (fcl == "C") {
                                        nl = "Calc: " + bcd["Fields"][fn]["Calculated Value"];
                                    }

                                    //multi-value fields
                                    if (bcd["Fields"][fn]["Multi Valued"] == "Y") {
                                        //debugger;
                                        mvlink = bcd["Fields"][fn]["Multi Value Link"];
                                        mvfield = bcd["Fields"][fn]["Dest Field"];
                                        if (typeof (bcd["Multi Value Links"][mvlink]) !== "undefined") {
                                            mvbc = bcd["Multi Value Links"][mvlink]["Destination Business Component"];
                                            bcd2 = ut.GetBCData(mvbc);
                                            if (typeof (bcd2["Fields"][mvfield]) !== "undefined") {
                                                table = bcd2["Table"];
                                                column = bcd2["Fields"][mvfield]["Column"];
                                                //Join lookup
                                                if (bcd2["Fields"][mvfield]["Join"] != "") {
                                                    join = bcd2["Fields"][mvfield]["Join"];
                                                    if (typeof (bcd2["Joins"][join]) !== "undefined") {
                                                        table = bcd2["Joins"][join]["Table"];
                                                    }
                                                    else {
                                                        table = join;
                                                    }
                                                }
                                            }
                                        }
                                        //nl = "MVF: " + mvbc + "::" + mvfield;
                                        nl = "MVF: " + table + "." + column;
                                    }
                                }
                                //field not found in bcdata
                                else {
                                    //display field info from OUI layer
                                    nl = "System: " + fn + " (" + fdt + "/" + fln + ")" + frq + fcl;
                                }
                                ut.SetLabel(cs[c], nl, pm);
                            }
                        }
                    }
                }
            }
        }

        //the big equalizer function, always get a PM, no matter the input (almost)
        BCRMUtils.prototype.ValidateContext = function (inp) {
            var retval = false;
            try {
                var pm = null;
                var ap;
                //context might be an applet instance
                //the GetPModel function gives it away
                if (typeof (inp.GetPModel) === "function") {
                    pm = inp.GetPModel();
                }
                //or it is a PM already...
                else if (typeof (inp.OnControlEvent) === "function") {
                    pm = inp;
                }
                //... or a PR, then we can get the PM easily:
                else if (typeof (inp.GetPM) === "function") {
                    pm = inp.GetPM();
                }
                //...we do not like controls, but anyway...
                else if (typeof (inp.GetInputName) === "function") {
                    pm = inp.GetApplet().GetPModel();

                }
                //context is neither an applet, PM nor PR...
                //...but could be an id string such as "S_A1" or "Contact List Applet"
                else if (typeof (inp) === "string") {
                    var temp = inp;
                    var appletmap = SiebelApp.S_App.GetActiveView().GetAppletMap();
                    for (ap in appletmap) {
                        if (temp.indexOf("S_") === 0) {
                            if (appletmap[ap].GetPModel().Get("GetFullId") == inp) {
                                pm = appletmap[ap].GetPModel();
                            }
                        }
                        else { //assume it's the applet name
                            pm = appletmap[temp].GetPModel();
                        }
                    }
                }
                else {
                    throw ("BCRMUtils.ValidateContext: Could not equalize PM.");
                }
            }
            catch (e) {
                console.log(e.toString());
            }
            finally {
                retval = pm;
            }
            return retval;
        };

        //get applet type
        BCRMUtils.prototype.GetAppletType = function (context) {
            var retval = false;
            var type = null;
            var pm = null;
            var id = null;
            var an = "";
            var ut = new SiebelAppFacade.BCRMUtils();
            pm = ut.ValidateContext(context);
            if (pm) {
                if (typeof (pm.Get) === "function") {
                    if (pm.Get("GetListOfColumns")) {
                        retval = "list";
                        type = true;
                    }
                }
                id = pm.Get("GetFullId");
                if ($("#" + id).find(".siebui-tree").length != 0) { //it's a tree!
                    retval = "tree";
                    type = true;
                }
                else if (!type) {  //finding out whether it's a chart applet is tricky...
                    id = pm.Get("GetFullId").split("_")[1]; //chart applets have weird Ids
                    id = id.toLowerCase().charAt(0) + "_" + id.charAt(1);  //did I mention that they have weird Ids
                    if ($("#" + id).find(".siebui-charts-container").length != 0) {
                        retval = "chart"; //It's a Bingo! -- Do you say it like that? -- No, you just say 'Bingo!'.
                    }
                    else { //no list,tree or chart. 99% sure it's a form applet
                        retval = "form";
                    }
                }
                an = pm.GetObjName();
            }
            else {//not of this world...
                retval = "unknown"
            }
            //console.log("BCRMUtils.GetAppletType: " + an + " is a " + retval);
            return retval;
        };

        //get the applet DOM element
        BCRMUtils.prototype.GetAppletElem = function (context) {
            var retval = null;
            var ut = new SiebelAppFacade.BCRMUtils();
            var pm = ut.ValidateContext(context);
            var appletElem = null;
            if (pm) {
                var appletElemId = pm.Get("GetFullId");
                appletElem = $("#" + "s_" + appletElemId + "_div");
            }
            retval = appletElem;
            return retval;
        };
        return BCRMUtils;
    }());
}

/* 
@desc advanced AboutView plugin
@author VB(xapuk.com)
@version 1.3 2018/07/10
*/
var BCRM_AV_id = "SiebelAboutView";

// template
var $d;
var tmp = '' +
    '<div title="About View" id = "<%= BCRM_AV_id%>">' +
    '<% var v = SiebelApp.S_App.GetActiveView() %>' +
    '<b>Application:</b> <a><%= SiebelApp.S_App.GetName() %></a><br>' +
    '<b>View:</b> <a><%= v.GetName() %></a><br>' +
    '<b>BusObject:</b> <a><%= SiebelApp.S_App.GetActiveBusObj().GetName() %></a><br>' +
    '<% if(v.GetActiveTask()) { %>' +
    '<b>Task:</b> <a><%= v.GetActiveTask() %></a><br>' +
    '<% } %>' +
    '<b>Applets(<%= Object.keys(v.GetAppletMap()).length %>) / BusComps(<%= Object.keys(SiebelApp.S_App.GetActiveBusObj().GetBCMap()).length %>):</b><br>' +
    '<ul style="padding-left:20px">' +
    '<% for(applet in v.GetAppletMap()) { var a = v.GetAppletMap()[applet]; var bc = a.GetBusComp(); var r = bc.GetSelection() < bc.GetRecordSet().length?bc.GetRecordSet()[bc.GetSelection()]:{}; var os = "SiebelApp.S_App.GetActiveView().GetAppletMap()[\'" + applet + "\']"; var $ds = $("#" + a.GetFullId()); %>' +
    '<li>' +
    '<a data-target="controls"><b style="<% if($ds.is(":hidden")){ %>font-style:italic;<% } if(a===v.GetActiveApplet()){ %>text-decoration:underline<% } %>"><%= applet %></b></a> / ' +
    '<a data-target="fields"><b><%= bc.GetName() %></b></a>' +
    '<ul id="controls" style="display:none">' +
    '<hr>' +
    '<b>Applet:</b> <a><%= a.GetName() %></a><br/>' +
    '<b>BusComp:</b> <a><%= bc.GetName() %></a><br/>' +
    '<b>Mode:</b> <a><%= a.GetMode() %></a><br/>' +
    '<b>Title:</b> <a><%= a.GetAppletLabel() %></a><br/>' +
    '<% if(a.GetToggleApplet()){ %>' +
    '<b>Toggle:</b> <a><%= a.GetToggleApplet() %></a><br/>' +
    '<% } %>' +
    '<b>Object Selector:</b> <a><%= os %></a><br>' +
    '<b>DOM Selector:</b> <a>$(\"<%= $ds.selector %>\")</a><br>' +
    '<b>Controls (<%= Object.keys(a.GetControls()).length %>): </b>' +
    '<ul>' +
    '<% for(control in a.GetControls()) { var c = a.GetControls()[control]; var $cds = $ds.find("[name=\'" + c.GetInputName() + "\']") %>' +
    '<li>' +
    '<a data-target="control"><b style="<% if($cds.is(":hidden")){ %>font-style:italic;<% } if(c===a.GetActiveControl()){ %>text-decoration:underline<% } %>"><%= c.GetDisplayName()||control %></b></a>' +
    '<ul id="control">' +
    '<hr>' +
    '<% if($cds.is(":visible") && $cds.is(":focusable")){ %>' +
    '<button data-eval="$(\'<%= $cds.selector %>\').focus()">Focus</button><br>' +
    '<% } %>' +
    '<b>Control:</b> <a><%= control %></a><br>' +
    '<% if(c.GetFieldName()){ %>' +
    '<b>Field:</b> <a><%= c.GetFieldName() %></a><br>' +
    '<% if(r){ %>' +
    '<b>Value:</b> <a><%= r[c.GetFieldName()] %></a><br>' +
    '<% } %>' +
    '<b>Immediate post changes:</b> <a><%= c.IsPostChanges() %></a><br>' +
    '<% } %>' +
    '<b>Type:</b> <a><%= c.GetUIType() %></a> <br>' + // to decode value trhough SiebelJS.Dependency("SiebelApp.Constants");
    '<b>Input:</b> <a><%= c.GetInputName() %></a><br>' +
    '<b>Object Selector:</b> <a><%= os+".GetControls()[\'" + control + "\']" %></a><br>' +
    '<b>DOM Selector:</b> <a>$(\"<%= $cds.selector %>\")</a><br>' +
    '<% if(c.GetMethodName()){ %>' +
    '<b>Method:</b> <a><%= c.GetMethodName() %></a><br>' +
    '<% } %>' +
    '<% if(c.GetPMPropSet() && c.GetPMPropSet().propArrayLen > 0){ %>' +
    '<b>User Props (<%= Object.keys(c.GetPMPropSet().propArray).length %>):</b><br>' +
    '<ul>' +
    '<% for(p in c.GetPMPropSet().propArray){ %>' +
    '<% if("string" === typeof c.GetPMPropSet().propArray[p]){ %>' +
    '<li><a><%= p %></a> = <a><%= c.GetPMPropSet().propArray[p] %> </a></li>' +
    '<% } %>' +
    '<% } %>' +
    '</ul>' +
    '<% } %>' +
    '<% if(c.GetMethodPropSet() && c.GetMethodPropSet().propArrayLen > 0){ %>' +
    '<b>Method PS (<%= Object.keys(c.GetMethodPropSet().propArray).length %>):</b>' +
    '<ul>' +
    '<% for(p in c.GetMethodPropSet().propArray){ %>' +
    '<% if("string" === typeof c.GetMethodPropSet().propArray[p]){ %>' +
    '<li><a><%= p %></a> = <a><%= c.GetMethodPropSet().propArray[p] %> </a></li>' +
    '<% } %>' +
    '<% } %>' +
    '</ul>' +
    '<% } %>' +
    '<hr>' +
    '</ul>' +
    '</li>' +
    '<% } %>' +
    '</ul>' +
    '<hr>' +
    '</ul>' +
    '<ul id="fields" style="display:none">' +
    '<hr>' +
    '<b>BusComp:</b> <%= bc.GetName() %><br/>' +
    '<% if(r && r.hasOwnProperty("Id")){ %>' +
    '<b>Row Id:</b> <a><%= r.Id %></a><br/>' +
    '<% } %>' +
    '<% if(r && r.hasOwnProperty("Created")){ %>' +
    '<b>Created:</b> <a><%= r.Created %></a><br/>' +
    '<% } %>' +
    '<% if(r && r.hasOwnProperty("Updated")){ %>' +
    '<b>Updated:</b> <a><%= r.Updated %></a><br/>' +
    '<% } %>' +
    '<b>Commit pending:</b> <%= bc.commitPending %><br/>' +
    '<b>Fields:</b> <%= Object.keys(bc.GetFieldList()).length %><br/>' +
    '<b>Row:</b> <%= bc.GetCurRowNum()==-1?0:bc.GetCurRowNum() %> of <%= bc.GetNumRows() %><%= bc.IsNumRowsKnown()?"":"+" %><br/>' +
    '<ul>' +
    '<% for(var f in r){ %>' +
    '<li><a><%= f %></a> = <a><%= r[f] %></a></li>' +
    '<% } %>' +
    '</ul>' +
    '<hr>' +
    '</ul>' +
    '</li>' +
    '<% } %>' +
    '</ul>' +
    '</div>';
function BCRMSiebelAboutView() {

    // to support single session
    $("#" + BCRM_AV_id).parent().remove();

    if ("undefined" === typeof EJS) {
        var src = "3rdParty/ejs/ejs_production";
        requirejs([src], BCRMSiebelAboutView, function () { alert("Failed to load EJS library ! \n" + src); });
    }

    var html = new EJS({ text: tmp }).render(SiebelApp.S_App);

    $d = $(html).dialog({
        modal: true,
        width: "1024",
        open: function () {
            // hide all expandable ULs by default
            $(this).find("li").find("ul[id]").hide();
            // attempt to copy span content (click)
            $(this).find("a").click(function () {
                BCRMAboutViewCopy(this);
            });
            // expand (right click)
            $(this).find("a").contextmenu(function () {
                $(this).siblings("#" + $(this).attr("data-target")).toggle();
                $(this).siblings("ul[id]:not([id='" + $(this).attr("data-target") + "'])").hide();
                return false;
            });
            // focus on control
            $(this).find("button").click(function () {
                var str = $(this).attr("data-eval");
                $d.dialog('close');
                eval(str);
            });
        },
        close: function () {
            $(this).dialog('destroy').remove();
        },
        buttons: [
            {
                text: 'Help',
                click: function () {
                    window.open("http://xapuk.com/index.php?topic=80", "_blank");
                }
            },
            {
                text: 'Copy (left click)',
                disabled: true
            },
            {
                text: 'Expand (right click)',
                disabled: true
            },
            {
                text: 'Close (esc)',
                click: function () {
                    $(this).dialog('close');
                }
            }
        ]
    });

    // styling
    $d.css("padding-left", "20px");
    $d.find("ul").css("padding-left", "20px");
    $d.find("hr").css("margin", "5px");
    $d.find("a").hover(function (e) {
        $(this).css({ "text-decoration": e.type == "mouseenter" ? "underline" : "none" });
    });
}

// copy value
function BCRMAboutViewCopy(scope) {
    // replacing link with intput and select the value
    var val = $(scope).text();
    $(scope).hide().after("<input id='" + BCRM_AV_id + "i'>");
    $d.find("#" + BCRM_AV_id + "i").val(val).select();
    // attempt to copy value
    if (document.execCommand("copy", false, null)) {
        // if copied, display a message for a second
        $d.find("#" + BCRM_AV_id + "i").attr("disabled", "disabled").css("color", "red").val("Copied!");
        setTimeout(function () {
            $d.find("#" + BCRM_AV_id + "i").remove();
            $(scope).show();
        }, 700);
    } else {
        // if failed to copy, leave input until blur, so it can be copied manually
        $d.find("#" + BCRM_AV_id + "i").blur(function () {
            $(this).remove();
            $d.find("a").show();
        });
    }
}

/* 
@desc Framework allowing to run/evaluate eScript code
@author VB(xapuk.com)
@version 1.3 2018/12/05
@requires BS=FWK Runtime to be published
*/
var BCRMeditor; // AceJS editor object
var BCRMfunc = "SiebelEvalScript"; // function identifier
var BCRMsnip; // an array of saved snippets
var BCRMlast; // current snippet name

BCRMScriptEditor = function () {

    if ("undefined" === typeof ace) {
        var src = "https://cdnjs.cloudflare.com/ajax/libs/ace/1.4.2/ace.js";
        requirejs([src], BCRMScriptEditor, function () { alert("Failed to load ace library ! \n" + src); });
    }

    // dialog html
    var s = '<div title="eScript">'
        + '<select id = "' + BCRMfunc + 'List" style="display:block"><option value="*">New...</option></select>'
        + '<textarea id = "' + BCRMfunc + '" placeholder="eScript code..." style="height:150px"></textarea>'
        + '<label id = "' + BCRMfunc + '_lbl" for="' + BCRMfunc + '">Initialised</label>'
        + '<textarea id = "' + BCRMfunc + 'Out" rows="4" disabled></textarea>'
        + '<style>select,textarea{width:100%!Important}.ui-dialog-content{padding:0.5em 1em}</style>'
        + '</div>';

    // hard-remove dialog object from DOM, just in case
    $("#" + BCRMfunc + "List").parent().remove();

    var d = $(s).dialog({
        modal: true,
        width: 1024,
        open: function () {

            $('#' + BCRMfunc).focus();

            // load acejs plugin
            if ("undefined" === typeof ace) {
                var src = "https://cdnjs.cloudflare.com/ajax/libs/ace/1.4.2/ace.js";
                requirejs([src], BCRMScriptEditor, function () { alert("Failed to load ace library ! \n" + src); });
            }
            else {
                BCRMattachACE();
            }

            // List onchange
            $("#" + BCRMfunc + "List").change(function (event) {
                var n = $(this).val();
                if (n != "*" && n > "") {
                    if (BCRMeditor) {
                        BCRMeditor.setValue(BCRMsnip[n]);
                    } else {
                        $("#" + BCRMfunc).text(BCRMsnip[n]);
                    }
                    window.localStorage[BCRMfunc + "Last"] = n;
                }

            });

            // key bindings
            $("#" + BCRMfunc + "Out").parent().keydown(function (event) {
                if (event.ctrlKey && event.keyCode === 13) { // ctrl + Enter
                    BCRMEval();
                    return false;
                } else if (event.ctrlKey && event.keyCode === 83) { // ctrl + S
                    BCRMSave();
                    return false;
                }
            });

            BCRMLoad(); // load presaved params

        },
        close: function () {
            $(this).dialog('destroy').remove();
        },
        buttons: [
            {
                text: 'Run (Ctrl+Enter)',
                click: BCRMEval
            },
            {
                text: 'Save (Ctrl + S)',
                click: BCRMSave
            },
            {
                text: 'Remove',
                click: BCRMDelete
            },
            {
                text: 'Close (Esc)',
                click: function () {
                    $(this).dialog('close');
                }
            }
        ]
    });
}



BCRMEval = function () {

    var sExpr = BCRMGetCode();
    var sRes = "";
    var dTS = new Date();
    var isChrome = !!window.chrome;
    var isFirefox = typeof InstallTrigger !== 'undefined';

    // execution timestamp
    $('#' + BCRMfunc + "_lbl").text("Last executed at " + dTS.toISOString().replace("T", " ").replace("Z", " "));

    BCRMSave(); // save snippets every time you run it

    // invoke BS
    var service = SiebelApp.S_App.GetService("FWK Runtime");
    var ps = SiebelApp.S_App.NewPropertySet();
    ps.SetProperty("Expr", sExpr);
    var outputSet = service.InvokeMethod("EvalScript", ps);
    if (outputSet.GetProperty("Status") == "Error") {
        sRes = outputSet.GetChildByType("Errors").GetChild(0).GetProperty("ErrMsg");
    } else {
        sRes = outputSet.GetChildByType("ResultSet").GetProperty("Result");
    }
    $('#' + BCRMfunc + "Out").text(sRes);

    // show results in browser console
    if (console) {
        var a = sRes.split(String.fromCharCode(13));
        for (var i = 0; i < a.length; i++) {
            // split into 3 parts for styling
            var a2 = a[i].split('\t|\t');
            var s1 = "", s2 = "", s3 = "";
            if (a2.length > 1) {
                if (a2.length > 2) {
                    s1 = a2[0];
                    s2 = a2[1];
                    for (var j = 2; j < a2.length; j++) {
                        s3 += "\t" + a2[j];
                    }
                } else {
                    s1 = a2[0];
                    s3 = a2[1];
                }
            } else {
                s3 = a[i];
            }

            // collapse miltiline results
            if (s3.indexOf("\n") > -1) {
                if (isFirefox || isChrome) {
                    console.groupCollapsed("%c" + s1 + " \t%c" + s2, "color:DarkCyan;", "color:Maroon;font-weight:bold");
                } else {
                    console.groupCollapsed(s1 + " \t" + s2);
                }
                console.log(s3);
                console.groupEnd();
            } else {
                if (isFirefox || isChrome) {
                    console.log("%c" + s1 + " \t%c" + s2 + " \t%c" + s3, "color:DarkCyan;", "color:Maroon;font-weight:bold", "color:black;font-weight:normal");
                } else {
                    console.log(s1 + " \t" + s2 + " \t" + s3);
                }
            }
        }
    }
}

// attach acejs plugin
BCRMattachACE = function () {
    if ("undefined" === typeof ace) {
        var src = "https://cdnjs.cloudflare.com/ajax/libs/ace/1.4.2/ace.js";
        requirejs([src], BCRMScriptEditor, function () { alert("Failed to load ace library ! \n" + src); });
    }
    BCRMeditor = ace.edit(BCRMfunc);
    BCRMeditor.session.setMode("ace/mode/javascript");
    $(".ace_editor").css("height", "300");
}

// save button
BCRMSave = function () {
    var n = $('#' + BCRMfunc + "List").val();
    if (n == "*" || n == null) { // new
        n = prompt("Snippet name");
        if (n) {
            if (n.match(/.{2,}/)) {
                BCRMsnip[n] = BCRMGetCode(true);
                window.localStorage[BCRMfunc] = JSON.stringify(BCRMsnip);
                $('#' + BCRMfunc + "List").append('<option value="' + n + '">' + n + '</option>');
                $('#' + BCRMfunc + "List").val(n).change();
            } else {
                alert("Invalid snippet name!");
            }
        }
    } else { // existing
        BCRMsnip[n] = BCRMGetCode(true);
        window.localStorage[BCRMfunc] = JSON.stringify(BCRMsnip);
    }
}

// Remove button
BCRMDelete = function () {
    var n = $('#' + BCRMfunc + "List").val();
    if (confirm("Are you sure you want to delete a snippet: " + n)) {
        if (n && n != "*") {
            delete BCRMsnip[n]; // remove item
            window.localStorage[BCRMfunc] = JSON.stringify(BCRMsnip);
            delete window.localStorage[BCRMfunc + "Last"];
            BCRMLoad(); // reload list
        }
    }
}

// loads preserved code snippets
BCRMLoad = function () {

    var s = window.localStorage[BCRMfunc];

    // remove all dropdown items
    $("#" + BCRMfunc + "List option").remove();

    //clear editor
    if (BCRMeditor) {
        BCRMeditor.setValue("");
    } else {
        $("#" + BCRMfunc).text("");
    }

    // retrieve code snippets saved in local storage
    var li = '';
    if (s) {
        BCRMsnip = JSON.parse(s);
        for (k in BCRMsnip) {
            li += '<option value="' + k + '">' + k + '</option>';
        }
    } else {
        BCRMsnip = {};
    }
    $("#" + BCRMfunc + "List").append(li);

    //last snippet
    BCRMlast = window.localStorage[BCRMfunc + "Last"];
    if (BCRMlast) {
        $('#' + BCRMfunc + "List").val(BCRMlast).change();
    }
}

// returns either selected peace of code or full value from text area or ACEJS plugin
BCRMGetCode = function (bFull) {
    var sRes;
    if (BCRMeditor) {
        if (bFull || BCRMeditor.getSelectedText() === "") {
            sRes = BCRMeditor.getValue();
        } else {
            sRes = BCRMeditor.getSelectedText();
        }
    } else {
        var textComponent = document.getElementById(BCRMfunc);
        if (bFull) {
            sRes = $('#' + BCRMfunc).val();
        } else if (textComponent.selectionStart !== undefined && textComponent.selectionStart != textComponent.selectionEnd) {// Normal browsers
            sRes = textComponent.value.substring(textComponent.selectionStart, textComponent.selectionEnd);
        } else if (document.selection !== undefined) {// IE
            textComponent.focus();
            var sel = document.selection.createRange();
            sRes = sel.text;
        } else {
            sRes = $('#' + BCRMfunc).val();
        }
    }
    return sRes;
}  