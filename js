/* eslint no-debugger: "warn" */
import cx from 'classnames'
import React, { Component } from 'react'
import PropTypes from 'prop-types'
import './slider.scss';   
/**
 * 常量
 * @type {Object}
 */
const constants = {
    orientation: {
        horizontal: {
            dimension: 'width',
            direction: 'left',
            reverseDirection: 'right',
            coordinate: 'x'
        },
        vertical: {
            dimension: 'height',
            direction: 'top',
            reverseDirection: 'bottom',
            coordinate: 'y'
        }
    }
}

class Slider extends Component {
    constructor (props, context) {
        super(props, context)
        this.state = {
            active: false,
            limit: 0,
            grab: 0
        }
    }
    static propTypes = {
        min: PropTypes.number,
        max: PropTypes.number,
        step: PropTypes.number,
        value: PropTypes.number,
        orientation: PropTypes.string,
        tooltip: PropTypes.bool,
        reverse: PropTypes.bool,
        labels: PropTypes.object,
        handleLabel: PropTypes.string,
        format: PropTypes.func,
        onChangeStart: PropTypes.func,
        onChange: PropTypes.func,
        onChangeComplete: PropTypes.func
    };

    static defaultProps = {
        min: 0,
        max: 100,
        step: 1,
        value: 0,
        orientation: 'horizontal',
        tooltip: true,
        reverse: false,
        labels: {},
        handleLabel: ''
    };

    componentDidMount () {
        this.handleUpdate();
    }

    /**
     * 格式化提示组件和label
     * @param  {Number} - value
     * @return {Formatted Number}
     */
    handleFormat = value => {
        const { format } = this.props
        return format ? format(value) : value
    };

    /**
     * 更新Slider状态
     * @return {void}
     */
    handleUpdate = () => {
        if (!this.slider) {
            return
        }
        const { orientation } = this.props
        const dimension = capitalize(constants.orientation[orientation].dimension)
        const sliderPos = this.slider[`offset${dimension}`]
        const handlePos = this.handle[`offset${dimension}`]

        this.setState({
            limit: sliderPos - handlePos,
            grab: handlePos / 2
        })
    };

    /**
     * 监听mousemove和mouseup事件
     * @return {void}
     */
    handleStart = e => {
        const { onChangeStart } = this.props
        document.addEventListener('mousemove', this.handleDrag)
        document.addEventListener('mouseup', this.handleEnd)
        this.setState({
            active: true
        }, () => {
                onChangeStart && onChangeStart(e)
            }
        )
    };

    /**
     * 处理 drag/mousemove 事件
     * @param  {Object} e - Event object
     * @return {void}
     */
    handleDrag = e => {
        e.stopPropagation();
        const { onChange } = this.props;
        const { target: { className, classList, dataset } } = e;
        if (!onChange || className === 'rangeslider__labels') return;

        let value = this.position(e);

        if (
            classList &&
            classList.contains('rangeslider__label-item') &&
            dataset.value
        ) {
            value = parseFloat(dataset.value);
        }

        onChange && onChange(value, e);
    };

    /**
     * 滑动结束后
     * @return {void}
     */
    handleEnd = e => {
        const { onChangeComplete } = this.props;
        this.setState({
            active: false
        },  () => {
                onChangeComplete && onChangeComplete(e);
            }
        )
        document.removeEventListener('mousemove', this.handleDrag);
        document.removeEventListener('mouseup', this.handleEnd);
    };

    /**
     * 支持键盘箭头操作
     * @param  {Object} e - Event object
     * @return {void}
     */
    handleKeyDown = e => {
        e.preventDefault();
        const { keyCode } = e;
        const { value, min, max, step, onChange } = this.props;
        let sliderValue;

        switch (keyCode) {
        case 38:
        case 39:
            sliderValue = value + step > max ? max : value + step;
            onChange && onChange(sliderValue, e);
            break
        case 37:
        case 40:
            sliderValue = value - step < min ? min : value - step;
            onChange && onChange(sliderValue, e);
            break
        }
    };

    /**
     * 改变滑块的定位
     * @param  {number} value - 当前value
     * @return {position} pos - 滑动后的位置
     */
    getPositionFromValue = value => {
        const { limit } = this.state;
        const { min, max } = this.props;
        const diffMaxMin = max - min;
        const diffValMin = value - min;
        const percentage = diffValMin / diffMaxMin;
        const pos = Math.round(percentage * limit);

        return pos;
    };

    /**
     * 当前滑块位置对应的value
     * @param  {number} pos - 滑块位置
     * @return {number} value - Value
     */
    getValueFromPosition = pos => {
        const { limit } = this.state;
        const { orientation, min, max, step } = this.props;
        const percentage = clamp(pos, 0, limit) / (limit || 1);
        const baseVal = step * Math.round(percentage * (max - min) / step);
        const value = orientation === 'horizontal' ? baseVal + min : max - baseVal;

        return clamp(value, min, max);
    };

    /**
     * 根据value计算position
     * @param  {Object} e - Event
     * @return {number} value - Value
     */
    position = e => {
        const { grab } = this.state;
        const { orientation, reverse } = this.props;

        const node = this.slider;
        const coordinateStyle = constants.orientation[orientation].coordinate;
        const directionStyle = reverse;
        ? constants.orientation[orientation].reverseDirection
        : constants.orientation[orientation].direction
        const clientCoordinateStyle = `client${capitalize(coordinateStyle)}`;
        const coordinate = !e.touches;
        ? e[clientCoordinateStyle]
        : e.touches[0][clientCoordinateStyle];
        const direction = node.getBoundingClientRect()[directionStyle];
        const pos = reverse;
        ? direction - coordinate - grab
        : coordinate - direction - grab;
        const value = this.getValueFromPosition(pos);

        return value;
    };

   
    coordinates = pos => {
        const { limit, grab } = this.state;
        const { orientation } = this.props;
        const value = this.getValueFromPosition(pos);
        const position = this.getPositionFromValue(value);
        const handlePos = orientation === 'horizontal' ? position + grab : position;
        const fillPos = orientation === 'horizontal'? handlePos : limit - handlePos;

        return {
            fill: fillPos,
            handle: handlePos,
            label: handlePos
        };
    };

    renderLabels = labels => (
        <ul
            ref={sl => {this.labels = sl}}
            className={cx('rangeslider__labels')}
        >
            {labels}
        </ul>
    );

    render () {
        const {
            value,
            orientation,
            className,
            tooltip,
            reverse,
            labels,
            min,
            max,
            handleLabel
        } = this.props;
        const { active } = this.state;
        const dimension = constants.orientation[orientation].dimension;
        const direction = reverse
                        ? constants.orientation[orientation].reverseDirection
                        : constants.orientation[orientation].direction;
        const position = this.getPositionFromValue(value);
        const coords = this.coordinates(position);
        const fillStyle = { [dimension]: `${coords.fill}px` };
        const handleStyle = { [direction]: `${coords.handle}px` };
        let showTooltip = tooltip && active;

        let labelItems = [];
        let labelKeys = Object.keys(labels);

        if (labelKeys.length > 0) {
            labelKeys = labelKeys.sort((a, b) => (reverse ? a - b : b - a));

            for (let key of labelKeys) {
                const labelPosition = this.getPositionFromValue(key);
                const labelCoords = this.coordinates(labelPosition);
                const labelStyle = { [direction]: `${labelCoords.label}px` };

                labelItems.push(
                    <li
                        key={key}
                        className={cx('rangeslider__label-item')}
                        data-value={key}
                        onMouseDown={this.handleDrag}
                        onTouchStart={this.handleStart}
                        onTouchEnd={this.handleEnd}
                        style={labelStyle}
                    >
                        {this.props.labels[key]}
                    </li>
                );
            }
        }

        return (
            <div
                ref={s => {this.slider = s}}
                className = {cx(
                                'rangeslider',
                                `rangeslider-${orientation}`,
                                { 'rangeslider-reverse': reverse },
                                className)
                            }
                onMouseDown={this.handleDrag}
                onMouseUp={this.handleEnd}
                onTouchStart={this.handleStart}
                onTouchEnd={this.handleEnd}
                aria-valuemin={min}
                aria-valuemax={max}
                aria-valuenow={value}
                aria-orientation={orientation}
            >
                <div className='rangeslider__fill' style={fillStyle} />
                <div ref={sh => {this.handle = sh}}
                     className='rangeslider__handle'
                     onMouseDown={this.handleStart}
                     onTouchMove={this.handleDrag}
                     onTouchEnd={this.handleEnd}
                     onKeyDown={this.handleKeyDown}
                     style={handleStyle}
                     tabIndex={0}
                >
                {showTooltip
                    ?   <div  ref={st => {this.tooltip = st}}
                            className='rangeslider__handle-tooltip'
                        >
                            <span>{this.handleFormat(value)}</span>
                        </div>
                    : null}
                <div className='rangeslider__handle-label'>{handleLabel}</div>
                </div>
                {labels ? this.renderLabels(labelItems) : null}
            </div>
        )
    }
}
/**
 * 首字母大写
 * @private
 * @param  {string} - String
 * @return {string} - String 
 */
function capitalize (str) {
    return str.charAt(0).toUpperCase() + str.substr(1)
}

/**
 * 三个数字中间值
 * @param  {number} -
 * @param  {number} -
 * @param  {number} - 
 * @return {number} - value
 */
function clamp (value, min, max) {
    return Math.min(Math.max(value, min), max)
}
export default Slider
