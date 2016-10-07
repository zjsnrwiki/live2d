var l2d_index = '248_1';
var l2d_url = 'model-' + l2d_index + '/model.model.json';

var l2d_canvas = null;
var l2d_ctx = null;
var l2d_model = null;
var l2d_dragging = false;
var l2d_dragMgr = null;
var l2d_curTrigger = null;
var l2d_strokeStart = null;
var l2d_dragFromY = null;
var l2d_config = null;
var l2d_triggers = [ ];

var l2d_eyeY = 0.9;

function l2d_main()
{
    // I don't know how to calculate eyes' coordinate, so hard coded here
    if (l2d_index == '59_1')
        l2d_eyeY = 0.945;
    else if (l2d_index == '248_1')
        l2d_eyeY = 0.885;

    l2d_canvas = document.getElementById('live2d-canvas');
    var bg = document.getElementById('live2d-background').style;

    var vw = document.documentElement.clientWidth;
    if (l2d_canvas.width > vw * 0.9) {
        l2d_canvas.height *= vw * 0.9 / l2d_canvas.width;
        l2d_canvas.width = vw * 0.9;
        bg.height = l2d_canvas.height + 'px';
        bg.width = l2d_canvas.width + 'px';
    }

    document.getElementById('live2d-container').style.display = 'block';
    document.getElementById('live2d-button').style.display = 'none';

    var time = new Date().getHours();
    if (time < 6)
        bg.backgroundImage = 'url(user_detail_bg1.png)';
    else if (time < 12)
        bg.backgroundImage = 'url(user_detail_bg2.png)';
    else if (time < 18)
        bg.backgroundImage = 'url(user_detail_bg3.png)';
    else
        bg.backgroundImage = 'url(user_detail_bg4.png)';

    Live2D.init();
    Live2DFramework.setPlatformManager(new PlatformManager);

    l2d_model = new LAppModel();
    l2d_dragMgr = new L2DTargetPoint();

    addCanvasListeners();

    var ratio = l2d_canvas.height / l2d_canvas.width;

    this.viewMatrix = new L2DViewMatrix();
    this.viewMatrix.setScreenRect(-1, 1, -ratio, ratio);
    this.viewMatrix.setMaxScreenRect(-2, 2, -2, 2)

    this.projMatrix = new L2DMatrix44();
    this.projMatrix.multScale(1, 1 / ratio);

    this.deviceToScreen = new L2DMatrix44();
    this.deviceToScreen.multTranslate(-l2d_canvas.width / 2.0, -l2d_canvas.height / 2.0);
    this.deviceToScreen.multScale(2 / l2d_canvas.width, -2 / l2d_canvas.width);

    l2d_ctx = l2d_canvas.getContext("webgl", {premultipliedAlpha : true});
    Live2D.setGL(l2d_ctx);
    l2d_ctx.clearColor(0.0, 0.0, 0.0, 0.0);

    l2d_model.load(l2d_ctx, l2d_url);

    draw();
}

function addCanvasListeners()
{
    l2d_canvas.addEventListener("click", mouseEvent, false);
    l2d_canvas.addEventListener("mousedown", mouseEvent, false);
    l2d_canvas.addEventListener("mousemove", mouseEvent, false);
    l2d_canvas.addEventListener("mouseup", mouseEvent, false);
    l2d_canvas.addEventListener("mouseout", mouseEvent, false);
    l2d_canvas.addEventListener("contextmenu", mouseEvent, false);
    l2d_canvas.addEventListener("touchstart", touchEvent, false);
    l2d_canvas.addEventListener("touchend", touchEvent, false);
    l2d_canvas.addEventListener("touchmove", touchEvent, false);
}

function initTriggers()
{
    for (var hitArea of l2d_config.hit_areas)
        for (var triggerData of l2d_config.trigger)
            if (hitArea.id == triggerData.id) {
                var trigger = { area: hitArea.name, gesture: triggerData.actionType };
                trigger.expressions = [ ];
                for (var action of triggerData.action) {
                    if (l2d_config.motions[action] != null) {
                        trigger.motion = action;
                    } else {
                        for (var exp of l2d_config.expressions)
                            if (exp.name == action)
                                trigger.expressions.push(exp.name);
                    }
                }
                trigger.dialogue = triggerData.dialogue;
                l2d_triggers.push(trigger);
            }
    l2d_config = null;
}

function draw()
{
    if (l2d_config != null)
        initTriggers();

    MatrixStack.reset();
    MatrixStack.loadIdentity();

    l2d_dragMgr.update(); 
    l2d_model.setDrag(l2d_dragMgr.getX(), l2d_dragMgr.getY());

    l2d_ctx.clear(l2d_ctx.COLOR_BUFFER_BIT);

    MatrixStack.multMatrix(projMatrix.getArray());
    MatrixStack.multMatrix(viewMatrix.getArray());
    MatrixStack.push();

    if (l2d_model.initialized && !l2d_model.updating) {
        l2d_model.update();
        l2d_model.draw(l2d_ctx);
    }

    MatrixStack.pop();

    window.requestAnimationFrame(draw ,l2d_canvas);
}

function activeTrigger(trigger)
{
    l2d_model.startRandomMotion(trigger.motion, trigger.area == 'head' ? 2 : 3);
    if (trigger.expressions.length > 0) {
        l2d_model.setExpression(trigger.expressions[0]);
        setTimeout(function() { l2d_model.setExpression(trigger.expressions[1]); }, 200);
    }
}

function mouseDown(event)
{
    var rect = event.target.getBoundingClientRect();
    var x = transformViewX(event.clientX - rect.left);
    var y = transformViewY(event.clientY - rect.top);

    l2d_dragMgr.setPoint(x, y - l2d_eyeY);
    l2d_dragging = true;

    l2d_dragging = true;
    for (var trigger of l2d_triggers) {
        if (l2d_model.hitTest(trigger.area, x * 1.5, y)) {
            l2d_curTrigger = trigger;
            if (trigger.gesture == 'click') {
                activeTrigger(trigger);
            } if (trigger.gesture == 'stroke') {
                l2d_strokeStart = Date.now();
            } else if (trigger.gesture == 'up') {
                l2d_dragFromY = y;
            }
        }
    }
}

function mouseMove(event)
{
    var rect = event.target.getBoundingClientRect();
    var x = transformViewX(event.clientX - rect.left);
    var y = transformViewY(event.clientY - rect.top);

    if (l2d_dragging) {
        l2d_dragMgr.setPoint(x, y - l2d_eyeY);

        if (l2d_strokeStart != null) {
            if (!l2d_model.hitTest(l2d_curTrigger.area, x * 1.5, y))
                l2d_strokeStart = null;
            else
                if (Date.now() - l2d_strokeStart > 3000)
                    activeTrigger(l2d_curTrigger);
        }

        if (l2d_dragFromY != null && y > l2d_dragFromY
                && !l2d_model.hitTest(l2d_curTrigger.area, x * 1.5, y)) {
            activeTrigger(l2d_curTrigger);
            l2d_dragFromY = null;
        }
    }
}

function mouseUp()
{
    l2d_dragMgr.setPoint(0, 0);
    l2d_dragging = false;
    l2d_curTrigger = null;
    l2d_strokeStart = null;
    l2d_dragFromY = null;
}

function mouseEvent(e)
{
    e.preventDefault();
    if (e.type == "mousedown") {
        if("button" in e && e.button != 0) return;
        mouseDown(e);
    } else if (e.type == "mousemove") {
        mouseMove(e);
    } else if (e.type == "mouseup") {
        if("button" in e && e.button != 0) return;
        mouseUp();
    } else if (e.type == "mouseout") {
        mouseUp();
    }
}

function touchEvent(e)
{
    e.preventDefault();
    var touch = e.touches[0];
    if (e.type == "touchstart") {
        if (e.touches.length == 1)
            mouseDown(touch);
    } else if (e.type == "touchmove") {
        mouseMove(touch);
    } else if (e.type == "touchend") {
        mouseUp();
    }
}

function transformViewX(deviceX)
{
    var screenX = this.deviceToScreen.transformX(deviceX); 
    return viewMatrix.invertTransformX(screenX); 
}

function transformViewY(deviceY)
{
    var screenY = this.deviceToScreen.transformY(deviceY); 
    return viewMatrix.invertTransformY(screenY); 
}
