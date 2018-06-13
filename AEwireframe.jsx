{
  /*************************************************************************
  AE Wireframe v1.0
    By Joe Clay http://workbench.tv/
    Build a wireframe from an OBJ File

    Thanks to Lloyd Alvarez and Aharon Rabinowitz
    objFile vertices to AE Nulls © 2018 Lloyd Alvarez https://aescripts.com/
  *************************************************************************/

  function WB_AEwireframe() {
/*************************************************************************
	MAIN
*************************************************************************/
    var myComp = app.project.activeItem;
    if (!(myComp instanceof CompItem)) {
      alert("Please select a comp to generate wireframe into");
    } else {
      objFile = getOBJ();
      // layers = prompt("Single shape? Y/N","Y").toLowerCase() == 'n' ? true : false;
      // sliders = prompt("Slider to shift nulls? Y/N","N").toLowerCase() == 'n' ? false : true;
      // masterSlider = false;
      // if(sliders) {
      //   masterSlider = prompt("Link sliders to a master control?","Y").toLowerCase() == 'y' ? true : false;
      // }
      var vertices = [];
      var faces = [];
      getVerticesAndFaces(objFile);
      materialArray = getMaterials(objFile);
      buildWireframe(vertices, faces, materialArray);
    }

/*************************************************************************
	FUNCTIONS - File Handling
*************************************************************************/

    function getOBJ() {
      var objFile = File.openDialog("Please choose OBJ file");
      if (!objFile) return false;
      if (!(objFile instanceof File) || !objFile.name.toLowerCase().match(/\.obj$/)) {
        alert ("Please make sure it's an OBJ file with a .obj file extention")
        return false;
      } else {
        return objFile;
      }
    }

    function readFile(fileObject) {
      if(fileObject.open("r")) {
        var fileContents = fileObject.read();
        fileObject.close();
        return fileContents.split(/\r?\n/);
      } else {
        alert ("There was an error reading the obj file");
        return false;
      }
    }

/*************************************************************************
	FUNCTIONS - Parsing
*************************************************************************/

    function getMaterials(objFile) {
      var mat = {};
      var mtlFile = objFile.fsName.substr(0,objFile.fsName.length-3) + 'mtl';
      mtlFile = new File(mtlFile);
      if (!(mtlFile instanceof File)) {
        return mat.default = [1,1,1,1];
      }
      mtlLines = readFile(mtlFile);
      if(mtlLines) {
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
      return mat;
    }

    function getVerticesAndFaces(objFile) {
      objLines = readFile(objFile);
      if(objLines) {
        var data = [];
        for (var i=0; i<objLines.length; i++) {
          if (objLines[i].match(/^v\s/)) {
            data = objLines[i].replace(/^v\s/,"").split(/\s/);
            if (data.length == 3) {
              vertices.push(data);
            }
          } else if (objLines[i].match(/^f\s/)) {
            data = objLines[i].replace(/^f\s/,"").replace(/\s/g,",");
            faces.push(data);
          } else if (objLines[i].match(/^usemtl\s/)) {
            data = '+' + objLines[i].match(/^usemtl\s(.+)/)[1];
            faces.push(data)
          }
        }
        return;
      }
    }

/*************************************************************************
	FUNCTIONS - Build
*************************************************************************/

    function buildWireframe(vertices, faces, materials) {
      var vertexNull;
      var faceShape;
      if (vertices.length > 0) {
        app.beginUndoGroup("AE Wireframe");
        vertices.reverse();
        var parentNull = myComp.layers.addNull();
        parentNull.name = objFile.displayName;
        parentNull.threeDLayer = true;
        parentNull.position.setValue( [myComp.width/2,myComp.height/2] );
        for (var i=0; i<vertices.length; i++) {
          writeLn("Creating null "+(i+1)+" of "+(vertices.length));
          vertexNull = myComp.layers.addNull();
          vertexNull.threeDLayer = true;
          vertexNull.parent = parentNull;
          vertexNull.position.setValue(vertices[i]);
          vertexNull.shy = true;
          vertexNull.enabled = false;
        }
      }
      var matName = 'default';
      if (faces.length > 0) {
        faceShape = myComp.layers.addShape();
        faceShape.name = objFile.displayName;
        faceShape.moveToEnd();
        for( var i = 0; i < faces.length; i++) {
          writeLn("Creating shape "+(i+1)+" of "+(faces.length));
          if(faces[i].charAt(0) == '+') {
            //Material instead of face
            matName = faces[i].substr(1);
          } else {
            myGroup = faceShape.property("Contents").addProperty("ADBE Vector Group");
            myGroup.name = faces[i];

            myPath = myGroup.property("Contents").addProperty("ADBE Vector Shape - Group");
            myPath.property("ADBE Vector Shape").expression = "pts = thisProperty.propertyGroup(3).name.split(','); p = []; for(i = 0; i < pts.length; i++ ) { j = parseInt(pts[i]); p.push(fromCompToSurface(thisComp.layer(j).toComp([0,0,0]))); } createPath(p);"

            myStroke = myGroup.property("Contents").addProperty("ADBE Vector Graphic - Stroke");
            normalExpression = "pts = thisProperty.propertyGroup(3).name.split(','); p1 = thisComp.layer(parseInt(pts[0])).toComp([0,0,0]); p2 = thisComp.layer(parseInt(pts[1])).toComp([0,0,0]); p3 = thisComp.layer(parseInt(pts[2])).toComp([0,0,0]); n = calculateNormal(p1,p2,p3); function calculateNormal(p1,p2,p3){ u = [p2[0]-p1[0], p2[1]-p1[1], p2[2]-p1[2]]; v = [p3[0]-p1[0], p3[1]-p1[1], p3[2]-p1[2]]; N = cross(u, v); return dot(N,[0,0,-1]); } if(n > 0) { 100 } else { 10 };"
            myStroke.opacity.expression = normalExpression;
            myStroke.color.setValue(materials[matName]);
          }
        }
      }
      app.endUndoGroup();
    }
  } WB_AEwireframe();
}
