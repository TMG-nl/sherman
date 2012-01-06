//reads in javascript source from stdin
//executes jslint
//and writes report if any error found

var reader = java.io.BufferedReader(java.io.InputStreamReader(java.lang.System['in']));

var lines = [];

while(true) {
    line = reader.readLine();
    if(line == null) {
        break;
    }
    lines.push("" + line);
}

var result = JSLINT(lines, {
});

if(result == false) {
    var f = java.io.FileWriter("report.html");
    f.write("<html><body>");
    f.write("" + JSLINT.report());
    f.write("</body></html>");
    f.close();
    java.lang.System.out.println("Errors detected, see report in report.html");
    java.lang.System.exit(1);
}
else {
    java.lang.System.exit(0);
}


