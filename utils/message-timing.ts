interface DelayConfig {
  baseThinkingTime: number;   // Base delay before starting to "type"
  typeSpeed: number;          // Characters per second when "typing"
  randomVariation: number;    // Random variation percentage (0-1)
  minDelay: number;          // Minimum delay in milliseconds
  maxDelay: number;          // Maximum delay in milliseconds
}

export function calculateMessageDelay(
  message: string,
  config: DelayConfig = {
    baseThinkingTime: 500,    // 500ms base thinking time
    typeSpeed: 7,             // 7 characters per second (average human typing)
    randomVariation: 0.2,     // 20% random variation
    minDelay: 300,           // Minimum 300ms delay
    maxDelay: 3000           // Maximum 5 second delay
  }
): number {
  // Calculate base typing time based on message length
  const typingTime = (message.length / config.typeSpeed) * 1000;
  
  // Add thinking time that scales with message complexity
  const thinkingTime = config.baseThinkingTime * (1 + (message.length / 100));
  
  // Calculate total base delay
  let totalDelay = typingTime + thinkingTime;
  
  // Add random variation
  const variation = totalDelay * config.randomVariation;
  totalDelay += (Math.random() * variation) - (variation / 2);
  
  // Clamp to min/max values
  return Math.min(
    Math.max(totalDelay, config.minDelay),
    config.maxDelay
  );
} 