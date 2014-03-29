(function(){
  
  Renderer = function(canvas) {
    var canvas = $(canvas).get(0)
    var ctx = canvas.getContext("2d");
    var gfx = arbor.Graphics(canvas)
    var particleSystem = null
    var horizMargin = 5
    var vertMargin = 3
    var mouse = {node:null,x:0,y:0}
          
    var getTextHeight = function(font) {
      
	    var fontHeight = null
  
    	if (typeof(fontHeights) != "undefined") {
    	  fontHeight = fontHeights[font]
        if (fontHeight != null) {
        	return fontHeight
        }
    	} else {
    		fontHeights = []
    	}
      
	    fontHeight = {}
      
  	  var body = $('body')
      if (body[0].clientHeight < 1 || body[0].clientWidth < 1) {
        fontHeight.ascent = 0;
        fontHeight.height = 0;
        fontHeight.descent = 0;
      } else {

    	  var text = $('<span>Hg</span>').css({ font: font })
    	  var block = $('<div style="display: inline-block; width: 1px; height: 0px;"></div>')
    
    	  var div = $('<div></div>')
    	  div.append(text, block)
    
    	  body.append(div)
    
    	  try {
    
    	    block.css({ verticalAlign: 'baseline' })
    	    fontHeight.ascent = block.offset().top - text.offset().top
    
    	    block.css({ verticalAlign: 'bottom' })
    	    fontHeight.height = block.offset().top - text.offset().top
    
    	    fontHeight.descent = fontHeight.height - fontHeight.ascent
    
    	  } finally {
    	    div.remove()
    	  }
        
    	  fontHeights[font] = fontHeight
      }
  
  	  return fontHeight
  	};
    
    var drawBox = function(pt, w, h, node) {
          
      // draw a rectangle centered at pt
      if (node.data.color && node.data.color != 'none') ctx.fillStyle = node.data.color
//      else ctx.fillStyle = "rgba(0,0,0,.2)"
      else ctx.fillStyle = "rgba(200,200,200,1)"
      if (node.data.color=='none') ctx.fillStyle = "white"
      if (node.data.shape=='dot'){
        w = Math.max(w,h)
        h = Math.max(w,h)
      }
      
      var x = pt.x-w/2
      var y = pt.y-h/2
      
      if (x<0) {
      	pt.x-=x
      	x=0
      } else if ((x+w) > canvas.width && w < canvas.width) {
      	var diff=(x+w)-canvas.width
      	pt.x-=diff
        x-=diff
      }
          
      if (y<0) {
      	pt.y-=y
      	y=0
      } else if ((y+h) > canvas.height && h < canvas.height) {
      	var diff=(y+h)-canvas.height
      	pt.y-=diff
        y-=diff
      }
      
      ctx.save()
      if (node.data.shadow) {
        var xoff = 6 * ((x/canvas.width)-0.40)
        var yoff = 6 * ((y/canvas.height)-0.40)
        ctx.shadowColor="#555555"
        ctx.shadowOffsetX=xoff
        ctx.shadowOffsetY=yoff
        ctx.shadowBlur=7
      }
      if (node.data.shape=='dot'){
        gfx.oval(x, y, w, h, {fill:ctx.fillStyle})
      }else{
        gfx.rect(x, y, w, h, 6, {fill:ctx.fillStyle})
      }
      ctx.restore()
      var nodeBox = [x,y,w,h]
      return nodeBox
    };
    
    function getImageDataURL(img) {
//    function getBase64Image(img) {
      // Create an empty canvas element
      var canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;

      // Copy the image contents to the canvas
      var ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);

      // Get the data-URL formatted image
      // Firefox supports PNG and JPEG. You could check img.src to guess the
      // original format, but be aware the using "image/jpg" will re-encode the image.
      /*
      var dataURL = canvas.toDataURL("image/png");
      return dataURL.replace(/^data:image\/(png|jpg);base64,/, "");
      */
      return canvas.toDataURL("image/png");
    };
    
    var drawText = function(node, pt, font) {
      // node: {mass:#, p:{x,y}, name:"", data:{}}
      // pt:   {x:#, y:#}  node position in screen coords

      //returns nodeBox
      
      node.data.box = null
    	delete node.data.img
      node.data.img = null
        
      ctx.font = font
            
      var label = node.data.label||""
      if (!(""+label).match(/^[ \t]*$/)){
        pt.x = Math.floor(pt.x)
        pt.y = Math.floor(pt.y)
      }else{
        label = null
      }

      var labelLines = label+""
      if (label) {
      	labelLines = label.split("\\n")
      }
      var textHeight = getTextHeight(font)
      var lineHeight = (textHeight.height*labelLines.length)+vertMargin

      var w = 0
      for (var i = 0; i < labelLines.length; i++) {
        w = Math.max(w,ctx.measureText(""+labelLines[i]).width + (horizMargin*2))
      }
      var h = lineHeight
      var nodeBox = drawBox(pt, w, h, node)

      // draw the text
      if (label){
        var align = "center"
        x = pt.x
        y = pt.y-(lineHeight/2)+textHeight.ascent+2
        if (node.data.align!==undefined) {
      	  align = node.data.align
          if (align == "left") {
        	x -= (w/2-horizMargin)
          } else if (align == "right") {
        	x += (w/2-horizMargin)
          }
        }
        ctx.textAlign = align
        if (node.data.fontcolor) {
        	ctx.fillStyle = node.data.fontcolor
        } else {
          ctx.fillStyle = "white"
          if (node.data.color=='none') ctx.fillStyle = '#333333'
        }
        for (var i = 0; i < labelLines.length; i++) {
          ctx.fillText(labelLines[i]||"", x, y+(i*textHeight.height))
          ctx.fillText(labelLines[i]||"", x, y+(i*textHeight.height))
        }
      }
      
      return nodeBox
    };
    
    function qualifyURL(url){
      var img = document.createElement('img')
      img.src = url // set string url
      url = img.src // get qualified url
      img.src = '' // no server request
      return url
    };
  
    var drawHtml = function(node, pt, defaultFont) {
      // node: {mass:#, p:{x,y}, name:"", data:{}}
      // pt:   {x:#, y:#}  node position in screen coords
      
  	//returns nodeBox
      
    	var html = node.data.html
    	if (html=="test") {
        node.data.html = "<div><span style='background-color:red'>Yo " +
        		"<span style='text-decoration:underline;font-style:oblique'>dude!</span></span></div>" +
        		"<div>Title Here</div>" +
        		"<table style='width:100px'>" +
        		"<tr><td>Test Table</td><td><img src='"+arbor.etc.arbor_path()+"../demos/halfviz/style/logo.png'/></td></tr>" +
        		"<tr><td>ul</td><td style='text-align:right'>ur</td></tr>" +
        		"<tr><td>ll</td><td style='text-align:right'>lr</td></tr>" +
        		"</table>";
    	}
        
      var id ="renderToSVGDiv"
      var div =
        "<div id='"+id+"' xmlns='http://www.w3.org/1999/xhtml' style='font:"+defaultFont+"'>" +
          node.data.html+
        "</div>";
      
      if (node.data.box) {
        node.data.box = drawBox(pt, node.data.box[2], node.data.box[3], node)
      } else {
        window.document.getElementById('halfvizSVGDiv').innerHTML = div
        if (node.data.allLoaded != div) {
          var loader = imagesLoaded('#'+id, function(){
            node.data.allLoaded = div
            var parser = new DOMParser()
            var doc = parser.parseFromString("<div>"+node.data.html+"</div>", "application/xml");
            var images = doc.getElementsByTagName('img'); 
            for(var i = 0; i < images.length; i++) {
              var src = qualifyURL(images[i].attributes.src.value);
              if (src.indexOf("data:") != 0) {
                for(var j = 0; j < loader.images.length; j++) {
                  if (loader.images[j].img.src == src) {
                    images[i].attributes.src.value = getImageDataURL(loader.images[j].img);
                  }
                }
              }
            }
            node.data.html=doc.firstChild.innerHTML
            if (!node.data.html) {
            	var tmp = document.createElement('div')
              tmp.appendChild(doc.firstChild)
              node.data.html=tmp.innerHTML.substring(5,tmp.innerHTML.length-6)
            }
          	node.data.box = null
          	delete node.data.img
            node.data.img = null
            node.data.imgIsLoaded = false
            node.fixed = node.fixed // trigger redraw
          })
        }
        var element = canvas.ownerDocument.getElementById(id);
        node.data.box = drawBox(pt, element.clientWidth+(horizMargin*2), element.clientHeight+(vertMargin*2), node)
      }
      if (node.data.img) {
        if (node.data.imgIsLoaded) {
    	    ctx.drawImage(node.data.img, node.data.box[0]+horizMargin, node.data.box[1]+vertMargin)
        }
      } else {
        //var DOMURL = self.URL || self.webkitURL || self;
      	var img = new Image();
        var svgText = 
          "<svg xmlns='http://www.w3.org/2000/svg' width='"+node.data.box[2]+"' height='"+node.data.box[3]+"'>" +
          "<foreignObject width='100%' height='100%'>" +
            "<div id='"+id+"' xmlns='http://www.w3.org/1999/xhtml' style='font:"+defaultFont+
                ";width="+node.data.box[2]+"px;height="+node.data.box[3]+"px'>" +
              node.data.html+
            "</div>"+
          "</foreignObject>" +
          "</svg>";
        
      	img.onload = function() {
        	delete node.data.img
          node.data.img = img
          node.data.imgIsLoaded = true
          if (node.data.box != null) {
            node.data.box = drawBox(pt, node.data.box[2], node.data.box[3], node)
      	    ctx.drawImage(img, node.data.box[0]+horizMargin, node.data.box[1]+vertMargin)
          }
      	};
        node.data.imgIsLoaded = false
        img.src = "data:image/svg+xml,"+svgText
      }
  
      return node.data.box
    }
    
    var that = {
        
  	  fixed:false,
      
      init:function(system){
        
        particleSystem = system
        particleSystem.screenSize(canvas.width, canvas.height) 
        particleSystem.screenPadding(40)

        that.initMouseHandling()
      },

      redraw:function(){
        if (!particleSystem) return

        gfx.clear() // convenience ƒ: clears the whole canvas rect

        // draw the nodes & save their bounds for edge drawing
        var nodeBoxes = {}
        particleSystem.eachNode(function(node, pt){
          // node: {mass:#, p:{x,y}, name:"", data:{}}
          // pt:   {x:#, y:#}  node position in screen coords
              
          // determine the box size and round off the coords if we'll be 
          // drawing a text label (awful alignment jitter otherwise...)
          var font
          if (node.data.font) {
        	font = node.data.font
          } else {
        	font = "12px Arial"
          }
          
          if (node===mouse.node) {
          	pt.x = mouse.x
          	pt.y = mouse.y
          }
          
          if (node.data.html) {
            nodeBoxes[node.name] = drawHtml(node, pt, font)
          } else {
            nodeBoxes[node.name] = drawText(node, pt, font)
          }
// Not sure if something like this will help. Seems random...
          node.mass = Math.log(Math.max(5,(nodeBoxes[node.name][2]*nodeBoxes[node.name][3])/100))*4
        })

        // draw the edges
        particleSystem.eachEdge(function(edge, pt1, pt2){
          // edge: {source:Node, target:Node, length:#, data:{}}
          // pt1:  {x:#, y:#}  source position in screen coords
          // pt2:  {x:#, y:#}  target position in screen coords
          
          var source_box = nodeBoxes[edge.source.name]
          var target_box = nodeBoxes[edge.target.name]
// OVERRIDE POINTS WITH CENTER OF BOXES
        	pt1.x = source_box[0]+(source_box[2]/2)
        	pt1.y = source_box[1]+(source_box[3]/2)
        	pt2.x = target_box[0]+(target_box[2]/2)
        	pt2.y = target_box[1]+(target_box[3]/2)

          var weight = edge.data.weight
          var color = edge.data.color

          if (!color || (""+color).match(/^[ \t]*$/)) color = null

          // find the start point
          var tail = intersect_line_box(pt1, pt2, source_box)
          var head = intersect_line_box(tail, pt2, target_box)

          ctx.save() 
            ctx.beginPath()
            ctx.lineWidth = (!isNaN(weight)) ? parseFloat(weight) : 1
            ctx.strokeStyle = (color) ? color : "#cccccc"
            //ctx.fillStyle = null // this appears to be illegal

            ctx.moveTo(tail.x, tail.y)
            ctx.lineTo(head.x, head.y)
            ctx.stroke()
          ctx.restore()

          // draw an arrowhead if this is a -> style edge
          if (edge.data.directed){
            ctx.save()
              // move to the head position of the edge we just drew
              var wt = !isNaN(weight) ? parseFloat(weight) : 1
              var arrowLength = 6 + wt
              var arrowWidth = 2 + wt
              ctx.fillStyle = (color) ? color : "#cccccc"
              ctx.translate(head.x, head.y);
              ctx.rotate(Math.atan2(head.y - tail.y, head.x - tail.x));

              // delete some of the edge that's already there (so the point isn't hidden)
              ctx.clearRect(-arrowLength/2,-wt/2, arrowLength/2,wt)

              // draw the chevron
              ctx.beginPath();
              ctx.moveTo(-arrowLength, arrowWidth);
              ctx.lineTo(0, 0);
              ctx.lineTo(-arrowLength, -arrowWidth);
              ctx.lineTo(-arrowLength * 0.8, -0);
              ctx.closePath();
              ctx.fill();
            ctx.restore()
          }
            
          if (edge.data.label){
            ctx.save()
              var minx = Math.min(head.x,tail.x)
              var miny = Math.min(head.y,tail.y)
              var maxx = Math.max(head.x,tail.x)
              var maxy = Math.max(head.y,tail.y)
              var midx = minx + ((maxx - minx) / 2)
              var midy = miny + ((maxy - miny) / 2)
              
              ctx.translate(midx, midy);
              var angle = Math.atan2(head.y - tail.y, head.x - tail.x) - Math.PI/2;
              if (angle < (0-(Math.PI/2))) {
              	angle += Math.PI
              }
              ctx.rotate(angle);
            
              var font
              if (edge.data.font) {
              	font = edge.data.font
              } else {
              	font = "12px Arial"
              }
              ctx.font = font
              ctx.textAlign = "center"
              var textHeight = getTextHeight(font)
              var h = textHeight.height
              var w = ctx.measureText(edge.data.label).width
              if (edge.data.labelbackground) {
                ctx.fillStyle = edge.data.labelbackground
              } else {
                ctx.fillStyle = "white"
              }
              gfx.rect(-(w/2)-2, -(h/2), w+4, h, 0, {fill:ctx.fillStyle})
              if (edge.data.fontcolor) {
                ctx.fillStyle = edge.data.fontcolor
              } else {
                ctx.fillStyle = "black"
              }
              ctx.fillText(edge.data.label, 0, ((textHeight.ascent-textHeight.descent)/2))
            ctx.restore()
          }
        })
      },
      initMouseHandling:function(){
        // no-nonsense drag and drop (thanks springy.js)
        selected = null;
        nearest = null;
        var dragged = null;
        var oldmass = 1

        // set up a handler object that will initially listen for mousedowns then
        // for moves and mouseups while dragging
        var handler = {
          clicked:function(e){
            var pos = $(canvas).offset();
            _mouseP = arbor.Point(e.pageX-pos.left, e.pageY-pos.top)
            selected = nearest = dragged = particleSystem.nearest(_mouseP);
            mouse.node = selected.node
            mouse.x = _mouseP.x
            mouse.y = _mouseP.y

            if (dragged.node !== null) dragged.node.fixed = true

            $(canvas).bind('mousemove', handler.dragged)
            $(window).bind('mouseup', handler.dropped)

            return false
          },
          dragged:function(e){
            var old_nearest = nearest && nearest.node._id
            var pos = $(canvas).offset();
            var s = arbor.Point(e.pageX-pos.left, e.pageY-pos.top)
            mouse.x = s.x
            mouse.y = s.y

            if (!nearest) return
            if (dragged !== null && dragged.node !== null){
              var p = particleSystem.fromScreen(s)
              dragged.node.p = p
            }

            return false
          },

          dropped:function(e){
            if (dragged===null || dragged.node===undefined) return
            if (dragged.node !== null) dragged.node.fixed = that.fixed
            //dragged.node.tempMass = 1000
            dragged.node.tempMass = 50
            dragged = null
            selected = null
            mouse.node = null
            $(canvas).unbind('mousemove', handler.dragged)
            $(window).unbind('mouseup', handler.dropped)
            _mouseP = null
            return false
          }
        }
        $(canvas).mousedown(handler.clicked);

      }

    }

    // helpers for figuring out where to draw arrows (thanks springy.js)
    var intersect_line_line = function(p1, p2, p3, p4)
    {
      var denom = ((p4.y - p3.y)*(p2.x - p1.x) - (p4.x - p3.x)*(p2.y - p1.y));
      if (denom === 0) return false // lines are parallel
      var ua = ((p4.x - p3.x)*(p1.y - p3.y) - (p4.y - p3.y)*(p1.x - p3.x)) / denom;
      var ub = ((p2.x - p1.x)*(p1.y - p3.y) - (p2.y - p1.y)*(p1.x - p3.x)) / denom;

      if (ua < 0 || ua > 1 || ub < 0 || ub > 1)  return false
      return arbor.Point(p1.x + ua * (p2.x - p1.x), p1.y + ua * (p2.y - p1.y));
    }

    var intersect_line_box = function(p1, p2, boxTuple)
    {
      var p3 = {x:boxTuple[0], y:boxTuple[1]},
          w = boxTuple[2],
          h = boxTuple[3]

      var tl = {x: p3.x, y: p3.y};
      var tr = {x: p3.x + w, y: p3.y};
      var bl = {x: p3.x, y: p3.y + h};
      var br = {x: p3.x + w, y: p3.y + h};

      return intersect_line_line(p1, p2, tl, tr) ||
            intersect_line_line(p1, p2, tr, br) ||
            intersect_line_line(p1, p2, br, bl) ||
            intersect_line_line(p1, p2, bl, tl) ||
            false
    }

    return that
  }    
  
})()
