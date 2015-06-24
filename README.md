marionette.state
================

One-way state architecture for a Backbone.Marionette app.

## Installation

```
git clone git://github.com/Squareknot/marionette.state.git
bower install marionette-state
npm install marionette.state
```

## Documentation

- [Reasoning](#reasoning)
- [View State](#view-state)
- [Examples](#examples)
  - [Radio Button](#radio-button)
  - [Radio Button Group Synced with External Model](#radio-button-group-synced-with-application-model)
- [Marionette.State API](#marionette-state-api)
  - [Class Properties](#class-properties)
  - [Initialization Options](#initialization-options)
  - [Methods](#methods)
- [Marionette.State.Behavior API](#marionette-state-behavior-api)
  - [Behavior Options](#behavior-options)
  - [View Side Effects](#view-side-effects)
- [Marionette.State Functions API](#marionette-state-functions-api)

## Reasoning

A Marionette View is a DOM representation of a Backbone model. When the model updates, so does the view.  Here is a quick example:

```js
// Region to attach views
var region = new Marionette.Region({ el: '#main' });

// Model synced with '/rest-endpoint'
var model = new Backbone.Model({ url: '/rest-endpoint' });

// View will re-render when the model changes
var View = Marionette.ItemView({
  modelEvents: {
    'change': 'render'
  }
});

// Create the view
var view = new View({ model: model });

// Fetch the latest data
model.fetch().done(function () {
  // Show the view with initial data
  region.show(view);
});

// Updating the model later will cause the view to re-render.
model.fetch();
```

This is great for views that are only interested in representing simple content.  Consider more complex, yet quite common, scenarios:

* *A view renders core content but also reacts to user interaction.*  E.g., a view renders a list of people, but the end user is able to select individal items with a "highlight" effect before saving changes.
* *A view renders core content but also depends on external state.*  E.g., a view renders a person's profile, but if the profile belongs to the logged in user then enable "edit" features.
* *Multiple views share a core content model but each have unique view states.*  E.g., multiple views render a user profile object, but in completely different ways and with completely unique view states: an avatar beside a comment, a short bio available when hovering over an avatar, a full user profile display.

Common solutions:

* Store view states in the core content model, but write code to avoid sending those attributes to the server.
* Store view states in a model shared between views, hoping that changing one view's state won't cause needless re-renders in the other views.
* Store view states directly on the view object and surround each "set" with if statements to trigger view updates.

Each of these solutions works up until a point, but then side effects amount as complexity rises.  Symptoms of rising complexity with a more sophisticated pattern include poor performance (excessive repaints), buggy, hard to track down view logic (I _see_ the problem, but what is causing it?), or bloated models that are doing too much, maybe even transmitting data to the server that doesn't belong.

Separating state into its own entity and then maintaining that entity with one-way data binding solves each of these problems without the side effects of other solutions.  It is a pattern simple enough to implement using pure Marionette code, but this project seeks to simplify the implementation further by providing a state toolset.

`Marionette.State` allows a view to _seamlessly depend on any source of state_ while keeping state logic self-contained and eliminates the temptation to pollute core content models with view-specific state.  Best of all, `Marionette.State` does this by providing declarative and expressive tools rather than over-engineering for every use case, much like the Marionette library itself.

## One-way State Architecture

Before launching into examples, it will be helpful to examine one-way data binding as it applies to the problem of state management.  Consider the following common scenario on the view level:

1. A view is rendered with some initial state
2. A user interacts with the view
3. The view reacts by updating its state

Ideally, state logic can be separated from the view so that the view simply fires events and updates on state change.  Here's what that might look like:

<img class="diagram" src="https://docs.google.com/drawings/d/1MM7iAEzqIMYNvmasTfoO2uwR3TD9oaxuVwUKDslI8mo/pub?w=916&amp;h=269" height=480>

1. A view renders initial state.
2. The view triggers events that are handled by `Marionette.State`.
3. `Marionette.State` reacts to view events by changing its state.
4. The view reacts to state changes, completing the cycle.

The implementation is quite simple:

```js
var FooState = Marionette.State.extend({
  defaultState: {
    bar: true
  },

  componentEvents: {
    'disable': 'onToggle'
  },

  onToggle: function () {
    var bar = this.get('bar');
    this.set('bar', !bar);
  }
});

var FooView = Marionette.ItemView({
  triggers: {
    'click .js-toggle': 'toggle'
  },

  stateEvents: {
    'change:bar': 'onChangeBar'
  },

  initialize: function () {
    this.state = new FooState();

    // State is destroyed when view is destroyed, preventing memory leaks.
    // State change handlers are called both on 'render' and on 'change',
    // keeping the view in sync.
    this.state.bindComponent(this, { sync: 'render', lifetime: true });
  },

  onChangeBar: function (state, bar) {
    if (bar) {
      this.$el.addClass('is-bar');
    } else {
      this.$el.removeClass('is-bar');
    }
  }
});
```

This uni-directional flow of state management allows each entity to do a single job--the job it does best.  `Marionette.State` removes all logic from the view, leaving the view to fire events and update.

## View State

## Application State

## Sub-application State

### Toggle Button

In this example, a toggle button is "active" or "inactive" and its state is toggled with a click.  This state is not persisted, but it is reflected in the DOM.  The initial state is assumed to be "inactive".  Marionette.State manages the 'active' state by converting view events into state changes.  ToggleView's only responsibility is to react to state changes through the 'stateEvents' hash.

```js
var ToggleState = Marionette.State.extend({
  
  defaults: {
    active: false
  },

  componentEvents: {
    'toggle:active': 'onToggleActive'
  },

  onToggleActive: function () {
    var active = !this.get('active');
    this.set('active', active);
  }
});

var ToggleView = Marionette.ItemView.extend({
  
  template: '<%= label %>',
  tagName: 'button',

  behaviors: {
    behaviorClass: Marionette.State.Behavior,
    stateClass: ToggleState
  },

  modelEvents: {
    'change': 'render'
  },

  // Handlers are automatically onRender in addition to on changes.
  // This onRender behavior avoids boilerplate and keeps DOM synchronized with state.
  stateEvents: {
    'change:active', 'onChangeActive'
  },

  triggers: {
    'click': 'toggle:active'
  },

  onChangeActive: function(state, active) {
    if (active) this.$el.addClass('active');
    else this.$el.removeClass('active');
  }
});

// Create a toggle button
var buttonModel = new Backbone.Model({
  id: 1,
  label: 'foo'
});
var toggleView = new ToggleView({
  model: buttonModel
});

// Show the toggle button
var mainRegion = new Region({
  el: "#main"
});
mainRegion.show(toggleView);
```

### Radio Button Group Synced with External Model

In this example, a ToggleView is extended with Radio button-group behavior using Marionette.State to handle the logic.  Note that the view is identical except for switching out the logic (State) driving it.  This is possible because view logic is completely isolated from the view, leaving the view responsible for simple updates.

```js
var UserPreferenceState = Marionette.State.extend({

  defaults: {
    active: false
  },
  
  componentEvents: {
    'toggle:active': 'onToggleActive'
  },

  userEvents: {
    'change:userPreference', 'onChangeUserPreference'
  },

  initialize: function (options) {
    options = options || {};
    this.radioModel = options.radioModel;
    this.user = options.user;

    // Marionette.State.syncEntityEvents is similar to Marionette.bindEntityEvents, except here
    // it synchronizes state by calling change handlers immediately in addition to on changes.
    this.syncEntityEvents(user, userEvents);
  },

  // Use Backbone.Radio channel for application event: setting the user preference.
  onToggleActive: function () {
    if (!this.get('active')) {
      Backbone.Radio.command('user', 'set:userPreference', this.radioModel.id);
    }
  },

  // Whenever the user's preference radio changes, update 'active' state by the following rules:
  // - If current userPreference matches this one, set 'active' state to true.
  // - If current userPreference does not match this one, set 'active' state to false.
  onChangeUserPreference: function (user, userPreference) {
    var active = userPreference === this.radioModel.id;
    this.set('active', active);
  }
});

// Extends ToggleView only in its state management
var UserPreferenceView = ToggleView.extend({
  
  behaviors: {
    behaviorClass: Marionette.State.Behavior,
    stateClass: UserPreferenceState,
    mapOptions: {
      radioModel: 'model', // Pass the view's 'model' option to RadioState as 'radioModel'
      user: true           // Pass the view's 'user' option to RadioState as 'user'
    }
  },
});

var UserPreferencesView = Marionette.CollectionView.extend({

  childView: UserPreferenceView,

  // Accepts a 'user' option that is passed to child views
  initialize: function (options) {
    options = options || {};

    this.childViewOptions = {
      user: options.user
    }
  }
});

// Create the application user model
var user = new Backbone.Model({
  userPreference: 1
});

// Set up global Backbone.Radio handler for changing userPreference
Backbone.Radio.comply('user', 'set:userPreference', function (userPreference) {
  user.set('userPreference', userPreference);
});

// Initialize possible user preferences
var userPreferences = new Backbone.Collection([
  { id: 1, label: 'foo' },
  { id: 2, label: 'bar' },
  { id: 3, label: 'baz' }
]);

// Create user preferences selection view
var userPreferencesView = new UserPreferencesView({
  collection: userPreferences,
  user: user
});

// Show user preferences selection view
var mainRegion = new Region({
  el: "#main"
});
mainRegion.show(userPreferencesView);
```

## Marionette.State API

### Class Properties

**`modelClass`**

Optional state model class to instantiate, otherwise a pure Backbone.Model will be used.

**`defaultState`**

Optional default state attributes hash.  These will be applied to the underlying model when it is initialized.

**`componentEvents`**

Optional hash of component event bindings.  Enabled by passing `{ component: <Marionette object> }` as an option or by using a StateBehavior, in which case `component` is the view.

### Initialization Options

**`component`**

Optional Marionette object to which to bind lifecycle and events.  When `component` is destroyed the State instance is also destroyed.  The `componentEvents` events hash is also bound to `component`.  When using State with a StateBehavior, `component` is automatically set to the view.

**`initialState`**

Optional initial state attributes.  These attributes are combined with `defaultState` for initializing the underlying state model, and become the basis for future `reset()` calls.

### Methods

**`setState(attrs)`**

Resets the underlying state model and `initialState` (destructively) to conform to the passed attrs.  Future calls to `reset()` will return to this point.

**`getModel()`**

Returns the underlying state model.

**`getInitialState()`**

Returns a clone of the initial state hash leveraged by `reset()`.

**`reset()`**

Resets the state model to its value as of initialization or the last `setState()`.

**`set(attrs, options)`**

Proxy to state model `set(attrs, options)`.

**`get(attr)`**

Proxy to state model `get(attr)`.

**`setComponent(eventedObj)`**

Bind lifetime to an evented (Backbone.Events) object, e.g. a Backbone.Model or a Marionette object.  If the object has a `destroy` method, State will be destroyed automatically along with the object.  `componentEvents` are also bound to this object.

**`getComponent()`**

Returns current component.

**`syncEntityEvents(entity, entityEvents)`**

Binds `entityEvents` to `entity` exactly like `Marionette.bindEntityEvents`, but also calls handlers immediately for the purpose of initializing state.  See [Marionette.State Functions API](#marionette-state-functions-api): `syncEntityEvents`.

## Marionette.State.Behavior API

A StateBehavior adds Marionette.State seamlessly to a view, turning a view into a sophisticated component with separated view logic at almost no cost (next to no code bloat). 

### Behavior Options

**`stateClass`**

Type of Marionette.State to instantiate

**`initialState`**

Optional initial state attrs

**`stateOptions`**

Options to pass to Marionette.State

**`mapOptions`**

`mapOptions` permits declaratively mapping view options to state options in a few different ways:

`stateOption: 'viewOption'`

- `view.options.viewOption` will be passed as `stateOption`.

`stateOption: 'viewOption.property'`

- `view.options.viewOption.property` will be passed as `stateOption`.

`stateOption: true`

- `view.options.stateOptions` will be passed as `stateOption`.

`stateOption: function(viewOptions)`

- At view initialization time, return value of function given `view.options` will be passed as `stateOption`.

Using `mapOptions`, the view can be treated as a sophisticated "component", including receiving component options, but instead of managing component options internally it may proxy them to the State instance.

**`serialize`**

Whether to serialize state into template (default false).  State will be serialized underneath the `state` property.  For example:

```
var OkayState = Marionette.State.extend({
  
  defaultState: {
    disabled: 'disabled'
  }
});

var OkayView = Marionette.ItemView.extend({

  template: '<button <%= state.disabled %>>Okay</button>'
  
  behaviors: {
    State: {
      behaviorClass: Marionette.State.Behavior,
      stateClass: OkayState,
      serialize: true
    }
  }

  stateEvents: {
    'change': 'render'
  }
})
```

**`syncEvent`**

View event on which to call state handlers, keeping the DOM in sync with state. Defaults to 'render'.

### View Side Effects

**`view.state`**

On initialization, StateBehavior will set the `state` property on the View to the underlying state model of the State instance (`State.getModel()`).  This is useful for manually determining specific state values on the fly or passing to child views to keep them in sync with the overall component.

_Please note:_ A View calling `this.state.set()` is an anti-pattern, as it violates the one-way data flow described in the introduction.

## Marionette.State Functions API

**`syncEntityEvents(target, entity, entityEvents, event)`**

Binds `entityEvents` handlers located on `target` to `entity` using `Marionette.bindEntityEvents`, but then calls handlers either immediately or on `event` to ensure `target` is synchronized with `entity` state.  This synchronization step is timed as follows:

- If `event` is provided, then call handlers whenever `target` fires `event`.
- If `event` is not provided, then call handlers immediately.

**Example _without_ syncEntityEvents.**

```js
var View = Marionette.ItemView.extend({

  entityEvents: {
    'change:foo': 'onChangeFoo',
    'change:bar': 'onChangeBar'
  }

  initialize: function (options) {
    this.entity = new Backbone.Model({
      foo: 1,
      bar: 2  
    });
    Marionette.bindEntityEvents(this, this.entity, this.entityEvents);
  },

  onChangeFoo: function (entity, foo) {
    if (foo) this.$el.addClass('foo');
    else this.$el.removeClass('foo');
  },

  onChangeBar: function (entity, bar) {
    if (bar) this.$el.addClass('bar');
    else this.$el.removeClass('bar');
  },

  onRender: function () {
    this.onChangeFoo(this.entity, this.entity.get('foo'));
    this.onChangeBar(this.entity, this.entity.get('bar'));
  }
});
```

**Example _with_ syncEntityEvents.**

```js
var View = Marionette.ItemView.extend({

  entityEvents: {
    'change:foo': 'onChangeFoo',
    'change:bar': 'onChangeBar'
  }

  initialize: function (options) {
    this.entity = new Backbone.Model({
      foo: 1,
      bar: 2  
    });
    Marionette.State.syncEntityEvents(this, this.entity, this.entityEvents, 'render');
  },

  onChangeFoo: function (entity, foo) {
    if (foo) this.$el.addClass('foo');
    else this.$el.removeClass('foo');
  },

  onChangeBar: function (entity, bar) {
    if (bar) this.$el.addClass('bar');
    else this.$el.removeClass('bar');
  }
);
```

Event handlers are called with the same API as [Backbone.Model/Collection events](http://backbonejs.org/#Events-catalog).  Only the following events trigger state synchronization.

```
Backbone.Model
  'all'          (model)
  'change'       (model)
  'change:value' (model, value)
Backbone.Collection
  'all'          (collection)
  'reset'        (collection)
  'change'       (collection)
```

Notably, Collection `add` and `remove` events do not trigger state synchronization, because they do not have to do with initial state, but rather iterative state.  However, one may combine them, such as `add remove reset`, if one is interested in both initial and iterative state, since `add` and `remove` will not trigger additional handler calls--only `reset` will.

For event mappings with multiple events matching the rules above, all handlers are called for each event.  This is closest to Backbone.Events behavior, but be careful because you may accidently trigger more handler calls than you intended.  In the following example, both handlers are each called with values of 'foo' and 'bar':

```js
// These entityEvents
entityEvents: {
  'change:foo change:bar': 'onChangeFoo onChangeBar'
}

// Result in these calls
target.doSomething(model, model.get('foo'))
target.doSomethingElse(model, model.get('foo'))
target.doSomething(model, model.get('bar'))
target.doSomethingElse(model, model.get('bar'))
```

If one must react to two specific value changes with one or more of the same handlers, consider using a global 'change' event then checking the entity's [`changedAttributes()`](http://backbonejs.org/#Model-changedAttributes) object for the existence of the desired properties.  This is also the best approach for a familiar related scenario:

`modelEvents: {'change:foo change:bar': 'render'}` is best handled by
`modelEvents: {'change': 'onChange'}`, where `onChange` checks `model.changedAttributes()` for `foo` and `bar`.
