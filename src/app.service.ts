import { Injectable, OnApplicationShutdown } from '@nestjs/common';

@Injectable()
export class AppService implements OnApplicationShutdown {
  async getHello(): Promise<string> {
    await sleep();
    return 'Hello World!';
  }

  onApplicationShutdown(signal: string) {
    console.log(`received external signal: ${signal}`);
  }
}

async function sleep(t = 30_000): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, t));
}
