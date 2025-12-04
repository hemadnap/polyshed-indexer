# Testing Strategy & Guide

## Overview

This document outlines the comprehensive testing strategy for the Polyshed Indexer project. The testing framework uses **Vitest** for unit, integration, and end-to-end testing.

## Testing Framework

- **Framework**: Vitest (ESM-compatible, fast test runner)
- **Location**: `/test` directory
- **Pattern**: `*.test.js` files
- **Coverage**: Services, Repositories, Controllers, and Integration tests

## Test Structure

```
test/
├── setup.js                          # Shared test utilities and mocks
├── services/                         # Service unit tests
│   ├── WhaleTrackerService.test.js
│   ├── TradeProcessorService.test.js
│   ├── MarketService.test.js
│   ├── EventDetector.test.js
│   └── ClobService.test.js
├── repositories/                     # Repository unit tests
│   ├── WhaleRepository.test.js
│   └── PositionRepository.test.js
└── integration/                      # Integration tests
    └── IndexingController.integration.test.js
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- test/services/MarketService.test.js

# Run tests matching a pattern
npm test -- --grep "MarketService"

# Run with coverage
npm test -- --coverage

# Run tests in UI mode
npm test -- --ui
```

## Test Categories

### 1. Unit Tests - Services

**Location**: `test/services/*.test.js`

Unit tests for business logic services:

#### WhaleTrackerService.test.js
- **Coverage**: Core whale tracking functionality
- **Tests**:
  - Constructor initialization
  - Whale position updates
  - Trade history processing
  - Active whale management
  - Error handling and recovery

#### TradeProcessorService.test.js
- **Coverage**: Trade processing and validation
- **Tests**:
  - Trade parsing and normalization
  - Fee calculation
  - Trade grouping and aggregation
  - Duplicate detection
  - Data validation

#### MarketService.test.js
- **Coverage**: Market data management
- **Tests**:
  - Market synchronization from Polymarket
  - Paginated market syncing
  - Price snapshot capture
  - Market statistics calculation
  - Market details retrieval

#### EventDetector.test.js
- **Coverage**: Event detection from trades
- **Tests**:
  - New position detection
  - Position reversal detection
  - Double-down detection
  - Position exit detection
  - Large trade detection
  - Severity classification

#### ClobService.test.js
- **Coverage**: Polymarket API integration
- **Tests**:
  - Trade history fetching
  - Position retrieval
  - Market data fetching
  - Order book retrieval
  - API error handling
  - Rate limiting
  - Data validation

### 2. Unit Tests - Repositories

**Location**: `test/repositories/*.test.js`

Unit tests for database operations:

#### WhaleRepository.test.js
- **Coverage**: Whale record database operations
- **Tests**:
  - CRUD operations (Create, Read, Update, Delete)
  - Filtering by metrics
  - Top whales queries
  - Bulk operations
  - Transaction handling

#### PositionRepository.test.js
- **Coverage**: Position record database operations
- **Tests**:
  - Upsert operations
  - Position queries by wallet/market
  - Open/closed position tracking
  - Portfolio value calculations
  - Bulk updates

### 3. Integration Tests

**Location**: `test/integration/*.test.js`

End-to-end API endpoint tests:

#### IndexingController.integration.test.js
- **Coverage**: HTTP endpoints for indexing operations
- **Tests**:
  - Individual whale indexing
  - Batch whale reindexing
  - Status queries
  - Health checks
  - Queue management
  - Error handling
  - Rate limiting
  - Authorization

## Test Utilities

### Mock Factories

Located in `test/setup.js`:

```javascript
// Create mock environment
const mockEnv = createMockEnv()

// Create mock repository
const mockRepo = createMockRepository()

// Create mock service
const mockService = createMockService()

// Create test data
const whale = generateTestWhale()
const trade = generateTestTrade()
const position = generateTestPosition()
const market = generateTestMarket()
const event = generateTestEvent()
```

### Advanced Utilities

```javascript
// Mock API responses
mockPolymarketAPI()

// Wait for async conditions
await waitFor(() => condition, maxAttempts, delayMs)

// Create full test context
const context = createTestContext()

// Cleanup after tests
cleanupTestContext(context)
```

### Assertions

```javascript
// Validate whale data
expectValidWhale(whale)

// Validate trade data
expectValidTrade(trade)
```

## Writing Tests

### Basic Unit Test Pattern

```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { YourService } from '../../src/services/YourService.js'
import { createMockEnv } from '../setup.js'

describe('YourService', () => {
  let service
  let mockEnv

  beforeEach(() => {
    mockEnv = createMockEnv()
    service = new YourService(mockEnv)
  })

  describe('method', () => {
    it('should do something', async () => {
      // Arrange
      const input = { /* ... */ }
      vi.spyOn(service.repo, 'find').mockResolvedValue(input)

      // Act
      const result = await service.method(input)

      // Assert
      expect(result).toEqual(expected)
      expect(service.repo.find).toHaveBeenCalledWith(input)
    })

    it('should handle errors', async () => {
      vi.spyOn(service.repo, 'find')
        .mockRejectedValue(new Error('DB Error'))

      await expect(service.method({}))
        .rejects.toThrow('DB Error')
    })
  })
})
```

### Mocking External Dependencies

```javascript
// Mock a method
vi.spyOn(service, 'method').mockResolvedValue(expectedValue)

// Mock a rejected promise
vi.spyOn(service, 'method')
  .mockRejectedValue(new Error('Failed'))

// Mock with implementation
vi.spyOn(service, 'method')
  .mockImplementation(async (args) => {
    // Custom logic
    return result
  })

// Reset mocks
service.method.mockClear()
```

## Test Coverage

### Current Coverage

- **Services**: ~85% coverage
- **Repositories**: ~90% coverage
- **Controllers**: ~70% coverage (integration tests)
- **Overall**: ~80% coverage

### Target Coverage

- **Minimum**: 80% across all modules
- **Goal**: 90%+ for critical services
- **Critical Services**:
  - WhaleTrackerService
  - TradeProcessorService
  - EventDetector
  - WhaleRepository
  - PositionRepository

### Running Coverage Reports

```bash
npm test -- --coverage

# With detailed report
npm test -- --coverage --reporter=verbose

# Generate HTML report
npm test -- --coverage --reporter=html
```

## Best Practices

### 1. Test Organization

- ✅ Group related tests with `describe()` blocks
- ✅ Use descriptive test names
- ✅ Follow Arrange-Act-Assert pattern
- ✅ Keep tests focused and independent

### 2. Mocking

- ✅ Mock external dependencies
- ✅ Use realistic mock data
- ✅ Verify mock calls
- ✅ Clean up mocks after tests

### 3. Assertions

- ✅ Use specific assertions
- ✅ Test both success and error paths
- ✅ Validate error messages
- ✅ Test edge cases

### 4. Test Data

- ✅ Use data generators for consistency
- ✅ Create realistic test data
- ✅ Vary test inputs
- ✅ Test with boundary values

### 5. Async Testing

- ✅ Always use `async/await`
- ✅ Handle promise rejections
- ✅ Use `mockResolvedValue`/`mockRejectedValue`
- ✅ Test timeout scenarios

## Error Scenarios to Test

### API Errors
- ❌ Network failures
- ❌ HTTP errors (4xx, 5xx)
- ❌ Timeout errors
- ❌ Invalid responses

### Data Errors
- ❌ Missing fields
- ❌ Invalid data types
- ❌ Out-of-range values
- ❌ Conflicting data

### Database Errors
- ❌ Connection failures
- ❌ Query errors
- ❌ Constraint violations
- ❌ Transaction rollbacks

### Business Logic Errors
- ❌ Invalid wallet addresses
- ❌ Non-existent resources
- ❌ Authorization failures
- ❌ Rate limit exceeded

## Continuous Integration

### Pre-commit

```bash
# Run tests before committing
npm test

# Or with hooks
npm run prepare
```

### CI Pipeline

The project uses GitHub Actions for CI:

```yaml
- name: Run Tests
  run: npm test

- name: Generate Coverage
  run: npm test -- --coverage

- name: Upload Coverage
  uses: codecov/codecov-action@v3
```

## Debugging Tests

### Run Single Test

```bash
npm test -- test/services/MarketService.test.js
```

### Run Tests Matching Pattern

```bash
npm test -- --grep "MarketService"
```

### Debug with Console Output

```javascript
it('should work', () => {
  console.log('Debug info')
  expect(value).toBe(expected)
})
```

### Use VS Code Debugger

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Vitest",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["run", "test"],
  "console": "integratedTerminal"
}
```

## Adding New Tests

### Checklist

- [ ] Create test file in appropriate directory
- [ ] Import required utilities from `test/setup.js`
- [ ] Write tests following existing patterns
- [ ] Achieve minimum 80% coverage
- [ ] Run tests locally: `npm test`
- [ ] Verify no existing tests break
- [ ] Update this documentation if needed

### Template

```javascript
/**
 * Unit Tests for [Component Name]
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ComponentName } from '../../src/[path]/ComponentName.js'
import { createMockEnv, generateTestData } from '../setup.js'

describe('ComponentName', () => {
  let component
  let mockEnv

  beforeEach(() => {
    mockEnv = createMockEnv()
    component = new ComponentName(mockEnv)
  })

  describe('constructor', () => {
    it('should initialize properly', () => {
      expect(component).toBeDefined()
      expect(component.env).toBe(mockEnv)
    })
  })

  describe('method', () => {
    it('should handle success case', async () => {
      // Test implementation
    })

    it('should handle error case', async () => {
      // Error test implementation
    })
  })
})
```

## Troubleshooting

### Tests Timing Out

```javascript
// Increase timeout for specific test
it('slow test', async () => {
  // test
}, 10000) // 10 second timeout
```

### Mock Not Working

```javascript
// Ensure mock is applied before use
vi.spyOn(obj, 'method').mockResolvedValue(value)

// Verify mock was called
expect(obj.method).toHaveBeenCalled()
```

### Flaky Tests

- ✅ Avoid time-dependent tests
- ✅ Mock external services
- ✅ Use `waitFor()` for async operations
- ✅ Clean up state between tests

## Further Reading

- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](https://testingjavascript.com/)
- [Jest Matchers](https://vitest.dev/api/expect.html)
- [Mocking Guide](https://vitest.dev/guide/mocking.html)

## Contributing

When adding new features:

1. Write tests first (TDD preferred)
2. Ensure all tests pass
3. Achieve minimum coverage threshold
4. Update test documentation
5. Submit PR with test results

## Support

For test-related issues:

1. Check existing tests for patterns
2. Review `test/setup.js` for available utilities
3. Consult Vitest documentation
4. Create an issue with reproduction steps
