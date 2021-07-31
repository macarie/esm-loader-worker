// Code from https://rosettacode.org/wiki/Fibonacci_sequence#Recursive_32
export const fibonacci = (num: number): number =>
  num < 2 ? num : fibonacci(num - 1) + fibonacci(num - 2);
