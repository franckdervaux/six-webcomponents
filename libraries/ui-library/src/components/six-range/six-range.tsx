import { Component, Element, Event, EventEmitter, h, Method, Prop, State, Watch } from '@stencil/core';
import FormControl from '../../functional-components/form-control/form-control';
import { hasSlot } from '../../utils/slot';
import { EmptyPayload } from '../../utils/types';
import { EventListeners } from '../../utils/event-listeners';

let id = 0;

/**
 * @since 1.0
 * @status stable
 *
 * Forked from https://github.com/shoelace-style/shoelace version v2.0.0-beta27.
 *
 * @slot label - The input's label. Alternatively, you can use the label prop.
 * @slot help-text - Help text that describes how to use the input. Alternatively, you can use the help-text prop.
 * @slot error-text - Error text that is shown for validation errors. Alternatively, you can use the error-text prop.
 *
 * @part base - The component's base wrapper.
 * @part input - The native range input.
 * @part tooltip - The range tooltip.
 */
@Component({
  tag: 'six-range',
  styleUrl: 'six-range.scss',
  shadow: true,
})
export class SixRange {
  private inputId = `input-${++id}`;
  private labelId = `input-label-${id}`;
  private helpTextId = `input-help-text-${id}`;
  private customErrorText = '';
  private customValidation = false;
  private errorTextId = `input-error-text-${id}`;
  private eventListeners = new EventListeners();
  private resizeObserver?: ResizeObserver;

  private output?: HTMLElement;
  private nativeInput?: HTMLInputElement;

  @Element() host!: HTMLSixRangeElement;

  @State() hasFocus = false;
  @State() hasHelpTextSlot = false;
  @State() hasLabelSlot = false;
  @State() hasErrorTextSlot = false;
  @State() hasTooltip = false;

  /** The input's name attribute. */
  @Prop() name = '';

  /** The input's value attribute. */
  @Prop({ mutable: true }) value = 0;

  /** Set to true to make the input a required field. */
  @Prop({ reflect: true }) required = false;

  /** The range's label. Alternatively, you can use the label slot. */
  @Prop() label = '';

  /** The range's help text. Alternatively, you can use the help-text slot. */
  @Prop() helpText = '';

  /** The input's error text. Alternatively, you can use the error-text slot. */
  @Prop() errorText = '';

  /** Set to true to disable the input. */
  @Prop() disabled = false;

  /**
   * This will be true when the control is in an invalid state. Validity in range inputs is determined by the message
   * provided by the `setCustomValidity` method.
   */
  @Prop({ mutable: true, reflect: true }) invalid = false;

  /** The input's min attribute. */
  @Prop() min = 0;

  /** The input's max attribute. */
  @Prop() max = 100;

  /** The input's step attribute. */
  @Prop() step = 1;

  /** The preferred placedment of the tooltip. */
  @Prop() tooltip: 'top' | 'bottom' | 'none' = 'top';

  /** A function used to format the tooltip's value. */
  @Prop() tooltipFormatter = (value: number) => value.toString();

  /** Set to display the error text on blur and not when typing */
  @Prop() errorOnBlur = false;

  /** Emitted when the control's value changes. */
  @Event({ eventName: 'six-range-change' }) sixChange!: EventEmitter<EmptyPayload>;

  /** Emitted when the control loses focus. */
  @Event({ eventName: 'six-range-blur' }) sixBlur!: EventEmitter<EmptyPayload>;

  /** Emitted when the control gains focus. */
  @Event({ eventName: 'six-range-focus' }) sixFocus!: EventEmitter<EmptyPayload>;

  /** default value the slider will be reverted to when reset is executed */
  private defaultValue = 0;

  @Watch('label')
  @Watch('errorText')
  @Watch('helpText')
  handleLabelChange() {
    this.handleSlotChange();
  }

  @Watch('value')
  @Watch('min')
  @Watch('max')
  handleValueChange() {
    this.update();
    if (this.nativeInput != null) {
      this.invalid = !this.nativeInput.checkValidity();
    }
  }

  connectedCallback() {
    this.host.shadowRoot?.addEventListener('slotchange', this.handleSlotChange);
  }

  componentWillLoad() {
    this.update();
    this.defaultValue = this.value;
    this.handleSlotChange();
  }

  componentDidLoad() {
    const nativeInput = this.nativeInput;
    if (nativeInput == null) {
      return;
    }
    this.update();
    this.resizeObserver = new ResizeObserver(() => this.update());
    this.eventListeners.add(nativeInput, 'invalid', (event) => {
      if (this.customValidation || (!this.hasErrorTextSlot && this.errorText === '' && this.customErrorText === '')) {
        this.customErrorText = nativeInput.validationMessage;
      }
      event.preventDefault();
    });
  }

  disconnectedCallback() {
    this.host.shadowRoot?.removeEventListener('slotchange', this.handleSlotChange);
    this.eventListeners.removeAll();
  }

  /** Sets focus on the input. */
  @Method()
  async setFocus(options?: FocusOptions) {
    this.nativeInput?.focus(options);
  }

  /** Removes focus from the input. */
  @Method()
  async removeFocus() {
    this.nativeInput?.blur();
  }

  /** Sets a custom validation message. If `message` is not empty, the field will be considered invalid. */
  @Method()
  async setCustomValidity(message: string) {
    this.customErrorText = '';
    this.customValidation = message !== '';
    if (this.nativeInput != null) {
      this.nativeInput.setCustomValidity(message);
      this.invalid = !this.nativeInput.checkValidity();
    }
  }

  /** Resets the formcontrol */
  @Method()
  async reset() {
    this.value = this.defaultValue;
    this.customErrorText = '';
    this.customValidation = false;
    this.nativeInput?.setCustomValidity('');
    this.invalid = false;
  }

  private handleInput = () => {
    if (this.nativeInput != null) {
      this.update(parseFloat(this.nativeInput.value));
    }
    requestAnimationFrame(() => {
      this.sixChange.emit();
    });
  };

  private handleBlur = () => {
    this.hasFocus = false;
    this.hasTooltip = false;
    this.sixBlur.emit();
    if (this.nativeInput != null) {
      this.resizeObserver?.unobserve(this.nativeInput);
    }
  };

  private handleFocus = () => {
    this.hasFocus = true;
    this.hasTooltip = true;
    this.sixFocus.emit();
    if (this.nativeInput != null) {
      this.resizeObserver?.observe(this.nativeInput);
    }
  };

  private handleSlotChange = () => {
    this.hasHelpTextSlot = hasSlot(this.host, 'help-text');
    this.hasErrorTextSlot = hasSlot(this.host, 'error-text');
    this.hasLabelSlot = hasSlot(this.host, 'label');
  };

  private handleTouchStart = () => {
    this.setFocus();
  };

  private displayError() {
    return this.invalid && (!this.errorOnBlur || !this.hasFocus);
  }

  private syncTooltip(min: number, max: number, value: number) {
    if (this.tooltip !== 'none' && this.nativeInput != null && this.output != null) {
      const percent = Math.max(0, (value - min) / (max - min));
      const inputWidth = this.nativeInput.offsetWidth;
      const tooltipWidth = this.output.offsetWidth;
      const thumbSize = getComputedStyle(this.nativeInput).getPropertyValue('--thumb-size');
      const x = `calc(${inputWidth * percent}px - calc(calc(${percent} * ${thumbSize}) - calc(${thumbSize} / 2)))`;
      this.output.style.transform = `translateX(${x})`;
      this.output.style.marginLeft = `-${tooltipWidth / 2}px`;
    }
  }

  private isFirefox() {
    return navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
  }

  private update(updateValue?: number) {
    if (updateValue != null) {
      this.value = updateValue;
    }

    const min = Number(this.min) ?? 0;
    const max = Number(this.max) ?? 0;
    let value;
    const parsedValue = parseFloat(this.value as never);
    if (isNaN(parsedValue)) {
      value = this.getDefaultValue(min, max);
    } else {
      value = parsedValue;
    }

    if (this.nativeInput != null) {
      // The value may have constraints, so we set the native control's
      // value and sync it back to ensure it adheres to min, max, and step
      // properly.
      this.nativeInput.value = value.toString();
      this.value = parseFloat(this.nativeInput.value);
    } else {
      this.value = value;
    }
    this.calculateColorRunnableTrack(min, max, this.value);
    this.syncTooltip(min, max, this.value);
  }

  /**
   * from https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/range#value
   */
  private getDefaultValue(min: number, max: number): number {
    return max < min ? min : min + (max - min) / 2;
  }

  /**
   * For Firefox this functionality is not needed because it is supported by standard CSS.
   */
  private calculateColorRunnableTrack(min: number, max: number, value: number) {
    if (!this.isFirefox() && this.nativeInput != null) {
      const percent = Math.ceil(((value - min) / (max - min)) * 100);
      this.nativeInput.style.background =
        '-webkit-linear-gradient(left, var(--track-color) 0%, var(--track-color) ' +
        percent +
        '%, var(--six-color-web-rock-300) ' +
        percent +
        '%)';
    }
  }

  render() {
    return (
      <FormControl
        inputId={this.inputId}
        label={this.label}
        labelId={this.labelId}
        hasLabelSlot={this.hasLabelSlot}
        helpTextId={this.helpTextId}
        helpText={this.helpText}
        hasHelpTextSlot={this.hasHelpTextSlot}
        size="medium"
        errorTextId={this.errorTextId}
        errorText={this.customErrorText != null ? this.customErrorText : this.errorText}
        hasErrorTextSlot={this.hasErrorTextSlot}
        disabled={this.disabled}
        required={this.required}
        displayError={this.displayError()}
      >
        <div
          part="base"
          class={{
            range: true,

            // States
            'range--disabled': this.disabled,
            'range--focused': this.hasFocus,
            'range--tooltip-visible': this.hasTooltip,
            'range--tooltip-top': this.tooltip === 'top',
            'range--tooltip-bottom': this.tooltip === 'bottom',
          }}
          onTouchStart={this.handleTouchStart}
        >
          <input
            part="input"
            ref={(el) => (this.nativeInput = el)}
            type="range"
            class="range__control"
            name={this.name}
            disabled={this.disabled}
            min={this.min}
            max={this.max}
            step={this.step}
            value={this.value}
            onInput={this.handleInput}
            onFocus={this.handleFocus}
            onBlur={this.handleBlur}
          />
          {this.tooltip !== 'none' && (
            <output part="tooltip" ref={(el) => (this.output = el)} class="range__tooltip">
              {this.tooltipFormatter(this.value)}
            </output>
          )}
        </div>
      </FormControl>
    );
  }
}
