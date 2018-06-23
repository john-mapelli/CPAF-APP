

 

var assetsData;
var cash_filter;
var group_raw_amount;
var group_amount;
var strategy_raw_group;
var strategy_group;
var assetRingChart;
var strategy_bar_chart;
var datatable;

var strategy_month_group;
var group_month_amount;
var month_group_raw_amount;
var stratgegy_month_raw_amount;

window.onload = function(){ 
    
    jQuery("input#fileinput").change(function () {
    loadFile();
  });
};

/*document.getElementById('get_file').onclick = function() {
  document.getElementById('fileinput').click();
  console.log("clicked");
};*/


function loadFile() {

  console.log("Function call for " + this);
  var input, file, fr;
  console.log("got inside loadFile");

  if (typeof window.FileReader !== 'function') {
    alert("The file API isn't supported on this browser yet.");
    return;
  }

  input = document.getElementById('fileinput');
  if (!input) {
    alert("Um, couldn't find the fileinput element.");
  }
  else if (!input.files) {
    alert("This browser doesn't seem to support the `files` property of file inputs.");
  }
  else if (!input.files[0]) {
    alert("Please select a file before clicking 'Load'");
  }
  else {
    file = input.files[0];
    fr = new FileReader();
    fr.onload = receivedText;
    fr.readAsText(file);
    document.getElementById("top-charts").style.visibility = "visible"

    

    
  }

  


  function receivedText(e) {
    console.log("function receivedText")
    lines = e.target.result;
    assetsData = JSON.parse(lines); 

    startCrossfilter(assetsData);
    
  }

  function startCrossfilter(data) {
    console.log("function startCrossfilter")

    //////////////////////////////////////////
    //Calculate Variables
    //////////////////////////////////////////


    var ndx = crossfilter(data);
    var group_1_Dim = ndx.dimension(function(d) { return d["group level 1"]; });
    var strategy_Dim = ndx.dimension(function(d) { return d["strategy"]; });


    total = group_1_Dim.group().reduceSum(function(d) {return d.amount;});
    group_raw_amount = group_1_Dim.group().reduceSum(function(d) {return d.amount;}); 
    strategy_raw_group = strategy_Dim.group().reduceSum(function(d) {return d.amount;}); 


    stratgegy_month_raw_amount = group_1_Dim.group().reduceSum(function(d) {return d["monthly allocation"];}); 
    month_group_raw_amount     = group_1_Dim.group().reduceSum(function(d) {return d["monthly allocation"];}); 


    strategy_group = remove_empty_bins(strategy_raw_group);
    group_amount = remove_empty_bins(group_raw_amount);

    strategy_month_group = remove_empty_bins(stratgegy_month_raw_amount);
    group_month_amount = remove_empty_bins(month_group_raw_amount);



    console.log("strategy_month_group is: ")
    print_filter("strategy_month_group");


    //////////////////////////////////////////
    //Graphs
    //////////////////////////////////////////

    var bar_height = 500;
    var bar_width = 300;


    strategy_bar_chart = dc.barChart("#chart-strategy")
    strategy_bar_chart
      .width(bar_width).height(bar_height)
      .yAxisLabel("", 50)
      .dimension(strategy_Dim)
      .group(strategy_group)
      .x(d3.scale.ordinal().domain(["Offensive", "Defensive"])) // Need empty val to offset first value
      .xUnits(dc.units.ordinal); // Tell dc.js that we're using an ordinal x-axis

    strategy_bar_chart.yAxis().ticks(2);

    //////////////////////////////////////////


    var pie_width = 500;
    var pie_height = 500;

    assetRingChart  = dc.pieChart("#chart-asset-breakdown");
    assetRingChart
      .width(pie_width).height(pie_height)
      .dimension(group_1_Dim)
      .group(group_amount)
      .innerRadius(125)
      .ordering(function(d) { return -d.value; })
      .on('pretransition', function(chart) {
        chart.selectAll('text.pie-slice').text(function(d) {
            return d.data.key + ' ' + dc.utils.printSingleValue((d.endAngle - d.startAngle) / (2*Math.PI) * 100) + '%';
        })
      })
      .legend(dc.legend().x(pie_width/2 - 30).y(pie_height/2 - 30).itemHeight(13).gap(5));


    datatable   = dc.dataTable("#dc-data-table");
    datatable
      .dimension(strategy_Dim)
      .group(function(d) {return d.strategy;})
      .showGroups(false)
      // dynamic columns creation using an array of closures
      .columns([
          {
            label: "Type",
            format: function(d) {return d["group level 1"];}
          },
          {
            label: "Owner",
            format: function(d) {return d.owner;}
          },
          {
            label: "Amount",
            format: function(d) {return d.amount;}
          },
          {
            label: "Monthly Allocaton",
            format: function(d) {return d["monthly allocation"];}
          }
          
          
      ]);


    dc.renderAll();



  }


  //////////////////////////////////////////
  //Button Functions
  //////////////////////////////////////////



  document.getElementById ("monthButton").addEventListener ("click", updateDataToMonthly, false);
  document.getElementById ("totalButton").addEventListener ("click", updateDataToTotal, false);
  document.getElementById ("addNewButton").addEventListener ("click", openAccountEditWindow, false);
  var span = document.getElementsByClassName("close")[0];
  var modal = document.getElementById("addAccountModal");


  function updateDataToMonthly() {
    assetRingChart.group(group_month_amount);
    strategy_bar_chart.group(strategy_month_group);
    console.log("inside monthly call");
    print_filter("group_month_amount");
    print_filter("strategy_month_group");
    dc.renderAll();

  }

  function updateDataToTotal() {
    assetRingChart.group(group_amount);
    strategy_bar_chart.group(strategy_group);
    console.log("inside total call");
    dc.renderAll();


  }

  function openAccountEditWindow() {
    modal.style.display = "block";

  }

  // When the user clicks on <span> (x), close the modal
  span.onclick = function() {
    modal.style.display = "none";
  }

  // When the user clicks anywhere outside of the modal, close it
  window.onclick = function(event) {
      if (event.target == modal) {
          modal.style.display = "none";
      }
  }

  $('.add-account-modal-content').on("click", ".account-class-container", function() {
    console.log("clicked on an account with id:")
    var id = $(this).attr('id');
    console.log(id)
    var accountSelection = document.getElementsByClassName("add-account-selection")[0];
    var accountForm = document.getElementsByClassName("add-account-details")[0];
    console.log(accountSelection)
    accountSelection.style.display="none"
    accountForm.style.display="block"
    


  });





  //////////////////////////////////////////
  //Helper Functions
  //////////////////////////////////////////


  function remove_empty_bins(source_group) {
    return {
        all:function () {
            return source_group.all().filter(function(d) {
                return d.value != 0;
            });
        }
    };
  }

  function print_filter(filter){
    var f=eval(filter);
    if (typeof(f.length) != "undefined") {}else{}
    if (typeof(f.top) != "undefined") {f=f.top(Infinity);}else{}
    if (typeof(f.dimension) != "undefined") {f=f.dimension(function(d) { return "";}).top(Infinity);}else{}
    console.log(filter+"("+f.length+") = "+JSON.stringify(f).replace("[","[\n\t").replace(/}\,/g,"},\n\t").replace("]","\n]"));
  } 



}



