angular.module('dragAndDrop', [])
.directive('drag', function (dndApi, $window) {

  var drags = [];
  var parent = function (drag, max) {
    if (max > 5) {
      return false;  /* Just incase */
    }
    var p = drag.parent();
    if (p.hasClass('drop')) {
      return p[0];
    } else {
      max++;
      return parent(p, max);
    }
  };

  return {
    restrict: 'A',
    link: function ($scope, $elem, $attr) {
      function renderImage(canvas) {
        clone.elem = $window.document.createElementNS('http://www.w3.org/1999/xhtml', 'img');
        if (canvas) {
          clone.elem.src = canvas;
        }
      }
      function renderClone() {
        var canvas = $window.document.createElementNS('http://www.w3.org/1999/xhtml', 'canvas');
        canvas.width = '330';
        canvas.height = '120';

        var background = canvas.getContext('2d').createLinearGradient(0, 0, 0, 310);
        background.addColorStop(0, clone.colors[0]);
        background.addColorStop(1, clone.colors[1]);

        canvas.getContext('2d').beginPath();
        canvas.getContext('2d').rect(0, 0, 330, 120);

        canvas.getContext('2d').beginPath();
        canvas.getContext('2d').moveTo(10, 10);
        canvas.getContext('2d').lineTo(320, 10);
        canvas.getContext('2d').lineTo(320, 110);
        canvas.getContext('2d').lineTo(10, 110);
        canvas.getContext('2d').lineTo(10, 10);
        canvas.getContext('2d').strokeStyle = 'rgba(0,0,0,0.5)';
        canvas.getContext('2d').stroke();

        canvas.getContext('2d').shadowColor = 'rgba(0,0,0,0.5)';
        canvas.getContext('2d').shadowBlur = 10;

        canvas.getContext('2d').fillStyle = background;
        canvas.getContext('2d').fillRect(10, 10, 310, 100);

        renderImage(canvas.toDataURL());
      }



      var ngModel;
      if (angular.isDefined($scope.node)) {
        ngModel = $scope.node;
      } else if (angular.isDefined($scope.data)) {
        ngModel = $scope.data;
      } else {
        ngModel = $scope.$eval($attr.ngModel);
        if (angular.isUndefined(ngModel)) {
          return;
        }
      }

      var clone = {
        colors: [],
        elem: null
      };

      if (angular.isDefined($attr.clone)) {
        if ($attr.clone === 'mid') {
          clone.colors = ['#2e4b65','#123453'];
        } else {
          clone.colors = ['#222','#101010'];
        }
      }

      var elem = $elem[0];
      var end = $scope.$eval($attr.end);

      elem.addEventListener('dragstart', function (e) {
        if (drags.length === 0) {
          drags = angular.element.find('.drop');
        }

        angular.forEach(dndApi.areas(), function (value, key) {
          if (value[0] !== parent($elem, 0)) {
            value.addClass('draging');
          }
        });

        var resize = false;

        if (angular.isDefined($attr.resize)) {
          var max = $attr.resize ? +$attr.resize : 10;
          var targetDimensions = {
            width: e.target.offsetWidth,
            height: e.target.offsetHeight
          };
          if (e.layerX <= max && targetDimensions.height - e.layerY <= max) {
            resize = 'leftbottom';
          } else if (e.layerY <= max && targetDimensions.width - e.layerX <= max) {
            resize = 'righttop';
          }
        }

        $elem.addClass('on-drag');

        (e.originalEvent || e).dataTransfer.effectAllowed = e.altKey ? 'copy' : 'move';
        (e.originalEvent || e).dataTransfer.setData('text', '');

        var offset;

        if (resize) {
          offset = 0;
          renderImage();
          (e.originalEvent || e).dataTransfer.setDragImage(clone.elem, 0, 0);
        } else if (angular.isDefined($attr.clone)) {
          offset = 150;
          renderClone();
          (e.originalEvent || e).dataTransfer.setDragImage(clone.elem, 160, 60);
        } else {
          offset = e.offsetX;
        }

        dndApi.setData(ngModel, offset, resize);
      });

      elem.addEventListener('dragend', function (e) {
        var dropContent = $scope[$attr.dragContent];
        var event = e.dataTransfer.dropEffect;
        var result = dndApi.getData();

        $elem.removeClass('on-drag');

        angular.forEach(dndApi.areas(), function (area) {
          area.removeClass('draging');
        });

        if (angular.isFunction(end) && angular.isDefined(dropContent)) {
          if (event === 'move' && result.resize === false) {
            $scope.$apply(function () {
              end(ngModel, dropContent);
            });
          }
        }

        dndApi.clear();
        clone.elem = null;
      });

      elem.setAttribute('draggable', true);
    }
  };

}).directive('drop', function (dndApi) {

  var areas = [];
  var drags = [];

  return {
    link: function ($scope, $elem, $attr) {
      var ngModel;

      if (angular.isDefined($scope.node)) {
        ngModel = $scope.node;
      } else if (angular.isDefined($scope.data)) {
        ngModel = $scope.data;
      } else if (angular.isDefined($attr.ngModel)) {
        ngModel = $scope.$eval($attr.ngModel);
      }

      var elem = $elem[0];
      var drop = $scope.$eval($attr.drop);

      dndApi.addArea($elem);

      elem.addEventListener('drop', function (e) {

        var result = dndApi.getData();

        if (e.stopPropagation()) {
          e.preventDefault();
        }

        if (!result.resize &&
            e.dataTransfer.effectAllowed !== 'none' &&
            angular.isFunction(drop) &&
            angular.isDefined(result)) {

          var dropContent = $scope[$attr.dropContent];

          if (dropContent && typeof $scope.elementWidth !== "undefined") {
            var x = (e.offsetX - result.offset) / $scope.elementWidth * 100;
            result.data.position = {
              x: Math.max(Math.min(x, 100), 0)
            };
          }

          result.data.type = result.data.name.match(/\.mid$/i) ? 'mid' : 'wav';

          if (e.dataTransfer.effectAllowed !== 'none') {
            $scope.$apply(function () {
              drop(result.data, dropContent || false);
            });
          }

        }

        angular.forEach(dndApi.areas(), function (area, key) {
          area.addClass('draging');
        });
      });

      elem.addEventListener('dragenter', function (e) {
        if (e.preventDefault) {
          e.preventDefault();
        }
        return false;
      });
      //elem.addEventListener('dragleave', function (e) {
      //});

      elem.addEventListener('dragover', function (e) {
        if (e.preventDefault) {
          e.preventDefault();
        }
        return false;
      });
    }
  };

}).factory('dndApi', function () {

  var dnd = {
    dragObject : {}
  };

  var areas = [];

  return {
    addArea: function (area){
      areas.push(area);
    },
    areas: function () {
      return areas;
    },
    setData: function (data, offset, resize) {
      if (angular.isUndefined(data)) {
        dnd.drag = {};
        return;
      }
      var copy = angular.copy(data);
      dnd.drag = {
        data: copy,
        offset: offset,
        resize: resize
      };
    },
    clear : function (){
      delete dnd.drag;
    },
    getData : function (){
      return dnd.drag;
    }
  };
});