import _ from 'underscore';
import Backbone from 'backbone';
import Mn from 'backbone.marionette';

// Manage state for a component.
const State = Mn.Object.extend({

  // State model class to instantiate
  modelClass: undefined,

  // Default state attributes hash
  defaultState: undefined,

  // Events from my component
  componentEvents: undefined,

  // State model instance
  _model: undefined,

  // My component, facilitating lifecycle management and event bindings
  _component: undefined,

  // Initial state attributes hash after 'initialState' option and defaults are applied
  _initialState: undefined,

  // initialState {object} Initial state attributes
  constructor(initialState) {
    // State model class is either passed in, on the class, or a standard Backbone model
    this.modelClass = this.modelClass || Backbone.Model;

    // Initialize state
    this.initState(initialState);

    State.__super__.constructor.apply(this, arguments);
  },

  // Initialize model with attrs or reset it, destructively, to conform to attrs.
  initState(attrs, options) {
    // Set initial state.
    this._initialState = _.extend({}, this.defaultState, attrs);

    if (this._model) {
      // Reset existing model with initial state.
      this.reset(null, options);
    } else {
      // Create new model with initial state.
      /* eslint-disable new-cap */
      this._model = new this.modelClass(this._initialState);
      this._proxyModelEvents(this._model);
    }

    return this;
  },

  // Returns the initiate state, which is reverted to by reset()
  getInitialState() {
    return _.clone(this._initialState);
  },

  // Return the state model.
  getModel() {
    return this._model;
  },

  // Proxy to model set().
  set() {
    this._model.set.apply(this._model, arguments);
    return this;
  },

  // Proxy to model get().
  get() {
    return this._model.get.apply(this._model, arguments);
  },

  // Return state to its initial value.
  // If `attrs` is provided, they will override initial values for a "partial" reset.
  reset(attrs, options) {
    var resetAttrs = _.extend({}, this._initialState, attrs);
    this._model.set(resetAttrs, options);
    return this;
  },

  // Proxy to model changedAttributes().
  getChanged() {
    return this._model.changedAttributes();
  },

  // Proxy to model previousAttributes().
  getPrevious() {
    return this._model.previousAttributes();
  },

  // Determine if any of the passed attributes were changed during the last modification.
  hasAnyChanged(...attrs) {
    return !!_.chain(this._model.changed)
      .keys()
      .intersection(attrs)
      .size()
      .value();
  },

  // Bind this State's `componentEvents` to `component` and bind the component's `stateEvents`
  // to this State.
  // options {
  //   sync: {true|String event} If true, will sync component immediately by calling all
  //     `stateEvents` change handlers immediatel.  If a string, will call all `stateEvents`
  //     change handlers whenever the component fires the named event.
  //   lifetime: {boolean} If true, will destroy itself on `component` destroy event.
  // }
  bindComponent(component, options={}) {
    var stateEvents = component.stateEvents;
    var sync = options.sync;
    var lifetime = options.lifetime;
    if (this.componentEvents) {
      this.bindComponentEvents(component, this.componentEvents);
    }
    if (stateEvents) {
      if (sync === true) {
        State.syncEntityEvents(component, this, stateEvents);
      } else if (_.isString(sync)) {
        State.syncEntityEvents(component, this, stateEvents, sync);
      } else {
        Mn.bindEntityEvents(component, this, stateEvents);
      }
    }
    if (lifetime) {
      this.bindLifetime(component);
    }
    return this;
  },

  // Unbinds `component` from this State's `componentEvents` and ceases component from listening
  // to this State's state events.
  unbindComponent(component) {
    var stateEvents = component.stateEvents;
    if (this.componentEvents) {
      this.unbindEntityEvents(component, this.componentEvents);
    }
    if (stateEvents) {
      State.stopSyncingEntityEvents(component, this);
    }
    return this;
  },

  // When `component` fires "destroy" event, this State will also destroy.
  bindLifetime(component) {
    if (!this._boundDestroy) {
      this._boundDestroy = this.destroy.bind(this);
    }
    this.listenTo(component, 'destroy', this._boundDestroy);
    return this;
  },

  // Stop listening to `component` "destroy" event.
  unbindLifetime(component) {
    this.stopListening(component, 'destroy', this._boundDestroy);
    return this;
  },

  // Attach componentEvents to component
  bindComponentEvents(component) {
    this.bindEntityEvents(component, this.componentEvents);
    return this;
  },

  // Detach componentEvents from component
  unbindComponentEvents(component) {
    this.unbindEntityEvents(component, this.componentEvents);
    return this;
  },

  // Proxy to StateFunctions#syncEntityEvents.
  syncEntityEvents(entity, entityEvents, event) {
    State.syncEntityEvents(this, entity, entityEvents, event);
    return this;
  },

  // Proxy to StateFunctions#stopSyncingEntityEvents.
  stopSyncingEntityEvents(entity, entityEvents, event) {
    State.stopSyncingEntityEvents(this, entity, entityEvents, event);
  },

  // Convert model events to state events
  _proxyModelEvents: function (other) {
    this.listenTo(other, 'all', function () {
      if (arguments.length > 1 && arguments[1] === this._model) {
        // Replace model argument with State
        arguments[1] = this;
      }
      this.trigger.apply(this, arguments);
    });
  }
});

export default State;
