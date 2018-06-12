var myComp = app.project.activeItem;
if (!(myComp instanceof CompItem)) {
  alert("Please select a comp to generate the nulls into");
} else {
  var vertexArray = [];
  var faceArray = [];
  objFile_vertices_to_AE_Nulls();
}


function getMaterials(objFile) {
  var mat = {};
  var mtlFile = objFile.fsName.substr(0,objFile.fsName.length-3) + 'mtl';
  mtlFile = new File(mtlFile);
  if (!(mtlFile instanceof File)) {
    return mat.default = [1,1,1,1];
  }

  if(mtlFile.open("r")) {
    var mtl = mtlFile.read();
    mtlFile.close();
    var mtlLines = mtl.split(/\r?\n/);
    var matName = '';
    var data = '';

    for (var i = 0; i < mtlLines.length; i++) {
      if (mtlLines[i].match(/^newmtl\s/)) {
        //We've captured a material name
        matName = mtlLines[i].match(/^newmtl\s(.+)/)[1];
      }
      if (mtlLines[i].match(/^Kd\s/)) {
        data = mtlLines[i].match(/^Kd\s(.+)/)[1].split(/\s/);
        mat[matName] = data;
      }
    }
  }
  alert(mat);
  return mat;
}

function objFile_vertices_to_AE_Nulls () {
  // objFile vertices to AE Nulls
  // © 2018 Lloyd Alvarez https://aescripts.com/

  var objFile = File.openDialog("Please choose OBJ file");
  if (!objFile) return;
  if (!(objFile instanceof File) || !objFile.name.toLowerCase().match(/\.obj$/)) {
    alert ("Please make sure it's an OBJ file with a .obj file extention")
    return;
  }
  mat = getMaterials(objFile);
  if(objFile.open("r")) {
    var obj =  objFile.read();
    objFile.close();
    var objLines = obj.split(/\r?\n/);
    var data = [];
    var myNull;
    var myShape;
    for (var i=0; i<objLines.length; i++) {
      if (objLines[i].match(/^v\s/)) {
        data = objLines[i].replace(/^v\s/,"").split(/\s/);
        if (data.length == 3) {
          vertexArray.push(data);
        }
      } else if (objLines[i].match(/^f\s/)) {
        data = objLines[i].replace(/^f\s/,"").replace(/\s/g,",");
        faceArray.push(data); //Need to add in a line or something for mtl data
        //Might be faster to parse the mtl, and add as we go? Nah, probably not
        //Need to check mtl, and probably calculate color as we go though so it only runs that code once
      } else if (objLines[i].match(/^usemtl\s/)) {
        data = '+' + objLines[i].match(/^usemtl\s(.+)/)[1];
        faceArray.push(data)
      }
    }
    if (vertexArray.length > 0) {
      app.beginUndoGroup("objFile vertices to AE Nulls");
      vertexArray.reverse();
      var parentNull = myComp.layers.addNull();
      parentNull.name = objFile.displayName;
      parentNull.threeDLayer = true;
      parentNull.position.setValue( [myComp.width/2,myComp.height/2] );
      for (var i=0; i<vertexArray.length; i++) {
        writeLn("Creating null "+(i+1)+" of "+(vertexArray.length));
        myNull = myComp.layers.addNull();
        myNull.threeDLayer = true;
        myNull.parent = parentNull;
        myNull.position.setValue(vertexArray[i]);
        myNull.shy = true;
        myNull.enabled = false;
      }
    }
    var matName = 'default';
    if (faceArray.length > 0) {
      myShape = myComp.layers.addShape();
      myShape.name = objFile.displayName;
      myShape.moveToEnd();
      for( var i = 0; i < faceArray.length; i++) {
        writeLn("Creating shape "+(i+1)+" of "+(faceArray.length));
        if(faceArray[i].charAt(0) == '+') {
          //Material instead of face
          matName = faceArray[i].substr(1);
        } else {
          myGroup = myShape.property("Contents").addProperty("ADBE Vector Group");
          myGroup.name = faceArray[i];

          myPath = myGroup.property("Contents").addProperty("ADBE Vector Shape - Group");
          myPath.property("ADBE Vector Shape").expression = "pts = thisProperty.propertyGroup(3).name.split(','); p = []; for(i = 0; i < pts.length; i++ ) { j = parseInt(pts[i]); p.push(fromCompToSurface(thisComp.layer(j).toComp([0,0,0]))); } createPath(p);"

          myStroke = myGroup.property("Contents").addProperty("ADBE Vector Graphic - Stroke");
          normalExpression = "pts = thisProperty.propertyGroup(3).name.split(','); p1 = thisComp.layer(parseInt(pts[0])).toComp([0,0,0]); p2 = thisComp.layer(parseInt(pts[1])).toComp([0,0,0]); p3 = thisComp.layer(parseInt(pts[2])).toComp([0,0,0]); n = calculateNormal(p1,p2,p3); function calculateNormal(p1,p2,p3){ u = [p2[0]-p1[0], p2[1]-p1[1], p2[2]-p1[2]]; v = [p3[0]-p1[0], p3[1]-p1[1], p3[2]-p1[2]]; N = cross(u, v); return dot(N,[0,0,-1]); } if(n > 0) { 100 } else { 10 };"
          myStroke.opacity.expression = normalExpression;
          myStroke.color.setValue(mat[matName]);
        }
      }
    }

    app.endUndoGroup();

  } else {
    alert ("There was an error reading the obj file");
  }
}
