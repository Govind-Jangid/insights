import { FIELDTYPES, isEqual, safeJSONParse } from '@/utils'
import { useStorage } from '@vueuse/core'
import { computed, watch } from 'vue'

export function useQueryColumns(query) {
	const data = computed(() =>
		query.doc?.columns.map((column) => {
			return {
				...column,
				format_option: column.format_option ? safeJSONParse(column.format_option) : null,
				aggregation_condition: column.aggregation_condition
					? safeJSONParse(column.aggregation_condition)
					: null,
				expression: column.is_expression ? safeJSONParse(column.expression) : null,
			}
		})
	)

	// if tables changes then update columns options
	const tables = () =>
		query.tables.data?.reduce((acc, row) => {
			acc.push(row.table)
			if (row.join && row.join.with.value) {
				acc.push(row.join.with.value)
			}
			return acc
		}, [])
	const fetchColumns = (newVal, oldVal) => {
		if (newVal && !isEqual(newVal, oldVal)) {
			query.fetchColumns.submit()
		}
	}
	watch(tables, fetchColumns, { immediate: true })

	const options = computed(() =>
		query.fetchColumns.data?.message.map((c) => {
			return {
				...c,
				value: c.column, // calc value key for autocomplete options
				description: c.table_label,
			}
		})
	)
	watch(options, updateColumnOptionsCache)

	const indexOptions = computed(() => {
		return query.doc.columns
			.filter((c) => !FIELDTYPES.NUMBER.includes(c.type))
			.map((c) => {
				return {
					label: c.label,
					value: c.column || c.label,
				}
			})
	})
	const valueOptions = computed(() => {
		return query.doc.columns
			.filter((c) => FIELDTYPES.NUMBER.includes(c.type))
			.map((c) => {
				return {
					label: c.label,
					value: c.column || c.label,
				}
			})
	})

	return { data, options, indexOptions, valueOptions, getOperatorOptions }
}

const cachedColumns = useStorage('insights:columns', {})

function updateColumnOptionsCache(columns) {
	cachedColumns.value = columns.reduce((acc, column) => {
		const key = `${column.table}_${column.column}`
		if (!acc[key]) {
			acc[key] = column
		}
		return acc
	}, cachedColumns.value)
}

export function getColumn(column) {
	return cachedColumns.value[`${column.table}_${column.column}`]
}

export function getOperatorOptions(columnType) {
	let options = [
		{ label: 'equals', value: '=' },
		{ label: 'not equals', value: '!=' },
		{ label: 'is', value: 'is' },
	]

	if (!columnType) {
		return options
	}

	if (FIELDTYPES.TEXT.includes(columnType)) {
		options = options.concat([
			{ label: 'contains', value: 'contains' },
			{ label: 'not contains', value: 'not_contains' },
			{ label: 'starts with', value: 'starts_with' },
			{ label: 'ends with', value: 'ends_with' },
			{ label: 'one of', value: 'in' },
			{ label: 'not one of', value: 'not_in' },
		])
	}
	if (FIELDTYPES.NUMBER.includes(columnType)) {
		options = options.concat([
			{ label: 'one of', value: 'in' },
			{ label: 'not one of', value: 'not_in' },
			{ label: 'greater than', value: '>' },
			{ label: 'smaller than', value: '<' },
			{ label: 'greater than equal to', value: '>=' },
			{ label: 'smaller than equal to', value: '<=' },
			{ label: 'between', value: 'between' },
		])
	}
	if (FIELDTYPES.DATE.includes(columnType)) {
		options = options.concat([
			{ label: 'greater than', value: '>' },
			{ label: 'smaller than', value: '<' },
			{ label: 'greater than equal to', value: '>=' },
			{ label: 'smaller than equal to', value: '<=' },
			{ label: 'between', value: 'between' },
			{ label: 'within', value: 'timespan' },
		])
	}
	return options
}
