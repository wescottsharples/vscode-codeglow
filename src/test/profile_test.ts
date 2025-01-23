/**
 * Test file for profiling CodeGlow performance
 * Contains various structures to test different scenarios
 */

// Single-line comment for testing

/**
 * Multi-line comment block
 * for testing paragraph detection
 * and symbol detection
 */

// Small function
function smallFunction() {
    const x = 1;
    const y = 2;
    return x + y;
}

// Medium function with multiple paragraphs
function mediumFunction() {
    // First paragraph
    const items = [1, 2, 3, 4, 5];
    const doubled = items.map(x => x * 2);

    // Second paragraph
    const sum = doubled.reduce((acc, curr) => {
        return acc + curr;
    }, 0);

    return sum;
}

// Large class with nested methods
class TestClass {
    private value: number;

    constructor(initialValue: number) {
        this.value = initialValue;
    }

    // Method with a single paragraph
    public getValue(): number {
        return this.value;
    }

    // Method with multiple paragraphs
    public complexOperation() {
        // First operation block
        const base = this.value * 2;
        const squared = base * base;

        // Second operation block
        const result = Array.from({ length: 5 }, (_, i) => {
            const step = i + 1;
            return squared * step;
        });

        // Final calculation block
        return result.reduce((acc, curr) => {
            return acc + curr;
        }, 0);
    }

    // Method with nested logic
    public nestedOperation(input: number[]) {
        return input.map(x => {
            const level1 = x * 2;
            
            return level1.toString()
                .split('')
                .map(char => {
                    const level2 = parseInt(char);
                    
                    return Array.from({ length: level2 }, (_, i) => {
                        const level3 = i * level2;
                        return level3;
                    });
                });
        });
    }
}

// Large paragraph of text
const documentation = `
Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
aliquip ex ea commodo consequat.
`;

// Multiple small paragraphs
const config = {
    name: 'test',
    version: '1.0.0',
};

const settings = {
    enabled: true,
    timeout: 1000,
};

const constants = {
    MAX_RETRIES: 3,
    DEFAULT_DELAY: 500,
};

// Nested object structure
const complexObject = {
    level1: {
        a: 1,
        b: 2,
        level2: {
            c: 3,
            d: 4,
            level3: {
                e: 5,
                f: 6
            }
        }
    }
};

// Export for TypeScript validation
export { TestClass, smallFunction, mediumFunction }; 