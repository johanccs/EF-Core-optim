using Microsoft.AspNetCore.Components.WebAssembly.Hosting;
using Playground;
using Playground.Engine;

var builder = WebAssemblyHostBuilder.CreateDefault(args);
builder.RootComponents.Add<App>("#app");
builder.Services.AddScoped(_ => new HttpClient { BaseAddress = new Uri(builder.HostEnvironment.BaseAddress) });
builder.Services.AddScoped<CodeRunner>();
await builder.Build().RunAsync();
