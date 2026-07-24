The Qwen Image Generation and Editing 3.0 model supports both text-to-image (T2I) and image-to-image/image editing (I2I). It can generate images directly from text prompts or edit images based on 1-3 reference images combined with editing instructions.

**Important**

This model is currently in limited preview. Apply for access on the Model Gallery before use.

## **Model overview**

| **Model** | **Description** | **Output image specifications** |
| --- | --- | --- |
| qwen-image-3.0-pro | Qwen Image Generation and Editing 3.0 model that supports both text-to-image (T2I) and image-to-image/image editing (I2I). | Image resolution: - **Text-to-image (T2I)**: Total pixels must be between 512\\*512 and 2048\\*2048. - **Image-to-image (I2I)**: Total pixels must be between 512\\*512 and 2048\\*2048. - **Default**: When `size` is not specified, the model automatically recommends a resolution based on the prompt. Image format: PNG |

## **Prerequisites**

Before making a call, [get an API key](/help/en/model-studio/get-api-key) and [export the API key as an environment variable](/help/en/model-studio/configure-api-key-through-environment-variables).

To call the API using the SDK, [install the DashScope SDK](/help/en/model-studio/install-sdk). The SDK is available for Python and Java.

**Important**

The China (Beijing) and Singapore regions have separate **API keys** and **request endpoints**. They cannot be used interchangeably. Cross-region calls lead to authentication failures or service errors.

**Important**

Alibaba Cloud Model Studio has released workspace-specific domains for the China (Beijing) and Singapore regions. **The new dedicated domains deliver superior performance and higher stability for inference requests**. We recommend migrating to the new domains:

-   China (Beijing): from `https://dashscope.aliyuncs.com` to `https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com`
    
-   Singapore: from `https://dashscope-intl.aliyuncs.com` to `https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com`
    

`{WorkspaceId}` is your workspace ID, which can be found on the **Workspace Details** page in the Alibaba Cloud Model Studio console. The existing domain remains fully functional.

## HTTP

**Singapore region:** `POST https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation`

**China (Beijing) region:** `POST https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation`

Replace `{WorkspaceId}` with your actual [Workspace ID](/help/en/model-studio/obtain-the-app-id-and-workspace-id#d3eb3cd37b7fu).

| #### Request parameters | ## Text-to-image (T2I) ``` curl --location 'https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation' \\ --header 'Content-Type: application/json' \\ --header "Authorization: Bearer $DASHSCOPE_API_KEY" \\ --data '{ "model": "qwen-image-3.0-pro", "input": { "messages": [ { "role": "user", "content": [ { "text": "A vertical outdoor portrait photograph with a warm afternoon street atmosphere. Deep green vines and small orange flowers cascade from building eaves across the upper area. A dark blue sign reads 'Il Messaggero' in white Gothic lettering, partially obscured by foliage. Below, a newsstand displays newspapers behind black metal-framed glass, blurred by shallow depth of field. Strong backlight streams from the street's end. Center-right, a young woman in a black spaghetti-strap backless dress looks back at the camera with a warm smile. Her long, thick wavy black hair is outlined by golden rim light. She has fair skin, bright eyes, soft coral-red lips, and holds a large bouquet of orange, apricot, pink and peach roses contrasting with her black dress. The sunlit city street stretches into the blurred background. Warm film-like tones with fine grain, soft contrast and pronounced backlit edge glow create a romantic, bright, urban strolling atmosphere." } ] } ] }, "parameters": { "prompt_extend": true } }' ``` ## Image-to-image / Image editing (I2I) ``` curl --location 'https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation' \\ --header 'Content-Type: application/json' \\ --header "Authorization: Bearer $DASHSCOPE_API_KEY" \\ --data '{ "model": "qwen-image-3.0-pro", "input": { "messages": [ { "role": "user", "content": [ { "image": "https://alidocs.oss-cn-zhangjiakou.aliyuncs.com/res/yBRq1ZPYEaXdyOdv/img/33a80a19-7ac7-4c64-b0fa-7d685b7046a0.png" }, { "text": "Generate a sophisticated urban-style female portrait. Perfectly preserve the facial features and smooth black long hair of the young woman in the input image. She changes from her beige knit top into an elegant urban professional outfit: a champagne silk blouse with a well-tailored dark grey casual blazer and matching high-waisted wide-leg trousers. The scene is in a modern minimalist upscale coffee shop with floor-to-ceiling windows showing a bustling city view. Dark wood tables and leather chairs furnish the interior, with a silver laptop, documents, and a steaming Americano on the table. She sits relaxed, leaning slightly back with one arm on the armrest and the other holding a coffee cup, gazing at the camera with calm, slightly languid eyes and an elegant smile. Polished formal makeup with clean base, defined brows, and mauve lipstick. Soft afternoon light enters from the side through the windows, creating delicate light transitions on her face and clothing. Natural bokeh background in earth tones, greys and warm whites, creating a serene, sophisticated urban office atmosphere." } ] } ] }, "parameters": { "prompt_extend": true } }' ``` |
| --- | --- |
| ##### Headers |
| **Content-Type** `*string*` **(Required)** The content type of the request. Must be `application/json`. |
| **Authorization** `*string*` **(Required)** Authenticates the request with a Model Studio API key. Example: Bearer sk-xxxx. |
| ##### Request body |
| **model** `*string*` **(Required)** The model name. The currently available model is `qwen-image-3.0-pro`. |
| **input** `*object*` **(Required)** The input parameter object, which contains the following fields: **Properties** **messages** `*array*` **(Required)** The request content array. **Only single-round conversations are supported**, so the array must contain **exactly one object** with `role` and `content` properties. **Properties** **role** `*string*` **(Required)** The role of the message sender. Must be set to `user`. **content** `*array*` **(Required)** The message content array, with different combinations depending on the use case: - **Text-to-image (T2I)**: Contains only one `{"text": "..."}` object. - **Image-to-image (I2I)**: Contains 1-3 `{"image": "..."}` objects and 1 `{"text": "..."}` object. **Properties** **image** `*string*` (Optional) The URL or Base64 encoded data of the input image. In I2I scenarios, 1-3 images are supported. When multiple images are provided, the order is defined by the array sequence. **Image requirements:** - Image format: JPG, JPEG, PNG, BMP, TIFF, WEBP, and GIF. - Image resolution: The width and height should be between 384 and 2048 pixels for best results. - Image size: Up to 10 MB. **Supported input formats** 1. Public URL: HTTP and HTTPS protocols are supported. 2. Base64 encoding: Format is `data:{MIME_type};base64,{base64_data}`. **text** `*string*` **(Required)** The positive prompt that describes the image content, style, and composition you want to generate or edit. Both Chinese and English are supported. **Note**: Only one text object is allowed. Omitting it or providing multiple text objects will result in an error. |
| **parameters** `*object*` (Optional) Additional parameters to control image generation. **Properties** **prompt\\_extend** `*boolean*` (Optional) Whether to enable intelligent prompt rewriting. Default: `true` (recommended). When enabled, the model optimizes the positive prompt, which significantly improves results for simple descriptions. **n** `*integer*` (Optional) The number of output images.Value range: 1 to 6. Default: 1. **size** `*string*` (Optional) The output image resolution in the format `width*height`, for example `"1024*1024"`. If not specified, the model automatically recommends a resolution based on the prompt. - **Text-to-image (T2I)**: Pixel range from 512\\*512 to 2048\\*2048. - **Image-to-image (I2I)**: Pixel range from 512\\*512 to 2048\\*2048. **negative\\_prompt** `*string*` (Optional) The negative prompt that describes content you do not want to appear in the image. **seed** `*integer*` (Optional) The random seed. Value range: `[0, 2147483647]`. A fixed seed helps maintain relatively stable results. **watermark** `*boolean*` (Optional) Whether to add a watermark. Default: `false`. |

| #### Response parameters | ## Success Task data (task status and image URLs) is retained for only 24 hours and then automatically purged. Save generated images promptly. ``` { "output": { "choices": [ { "finish_reason": "stop", "message": { "content": [ { "image": "https://dashscope-result-sz.oss-cn-shenzhen.aliyuncs.com/xxx.png?Expires=xxx" } ], "role": "assistant" } } ] }, "usage": { "width": 1024, "height": 1024, "image_count": 1 }, "request_id": "571ae02f-5c9d-436c-83c2-f221e6df0xxx" } ``` ## Error If the task fails, the response includes the error code and message. See [Error codes](/help/en/model-studio/error-code) for troubleshooting. ``` { "request_id": "31f808fd-8eef-9004-xxxxx", "code": "InvalidApiKey", "message": "Invalid API-key provided." } ``` |
| --- | --- |
| **output** `*object*` Contains the model generation results. **Properties** **choices** `*array*` The list of result options. **Properties** **finish\\_reason** `*string*` The reason why the task stopped. The value is `stop` when the task completes normally. **message** `*object*` The message returned by the model. **Properties** **role** `*string*` The role of the message. Fixed as `assistant`. **content** `*array*` The message content containing the generated image information. **Properties** **image** `*string*` The URL of the generated image in PNG format. **The link is valid for 24 hours**. Please download and save the image promptly. |
| **usage** `*object*` The resource usage of this call. Only returned on success. **Properties** **width** `*integer*` The width of the generated image in pixels. **height** `*integer*` The height of the generated image in pixels. **image\\_count** `*integer*` The number of generated images. |
| **request\\_id** `*string*` Unique request identifier for tracing and troubleshooting. |
| **code** `*string*` Error code. Returned only for failed requests. See [Error codes](/help/en/model-studio/error-code). |
| **message** `*string*` Detailed error message. Returned only for failed requests. See [Error codes](/help/en/model-studio/error-code). |

## SDK

The following examples demonstrate how to call the API using Python and Java SDKs for image-to-image / image editing (I2I).

## Python

```
import os
import base64
import mimetypes
import dashscope
from dashscope import MultiModalConversation

dashscope.base_http_api_url = 'https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1'

def encode_file(file_path):
    mime_type, _ = mimetypes.guess_type(file_path)
    if not mime_type or not mime_type.startswith("image/"):
        raise ValueError("Unsupported or unrecognized image format")
    with open(file_path, "rb") as image_file:
        encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
    return f"data:{mime_type};base64,{encoded_string}"

# [Method 1] Use a public image URL
image_url = "https://alidocs.oss-cn-zhangjiakou.aliyuncs.com/res/yBRq1ZPYEaXdyOdv/img/33a80a19-7ac7-4c64-b0fa-7d685b7046a0.png"

# [Method 2] Use a Base64-encoded image
# image_url = encode_file("./your_image.png")

response = MultiModalConversation.call(
    api_key=os.getenv("DASHSCOPE_API_KEY"),
    model="qwen-image-3.0-pro",
    messages=[{
        "role": "user",
        "content": [
            {"image": image_url},
            {"text": "Generate a sophisticated urban-style female portrait. Perfectly preserve the facial features and smooth black long hair of the young woman in the input image. Change her outfit to an elegant urban professional look. Set the scene in a modern minimalist upscale coffee shop."}
        ]
    }],
    prompt_extend=True
)

print(response)
if response.status_code == 200:
    url = response.output.choices[0].message.content[0]["image"]
    print(f"Generated image URL: {url}")
else:
    print(f"Error: {response.code} - {response.message}")
```

## Java

```
import java.util.Arrays;
import java.util.Base64;
import java.util.Collections;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import com.alibaba.dashscope.aigc.multimodalconversation.MultiModalConversation;
import com.alibaba.dashscope.aigc.multimodalconversation.MultiModalConversationParam;
import com.alibaba.dashscope.aigc.multimodalconversation.MultiModalConversationResult;
import com.alibaba.dashscope.common.MultiModalMessage;
import com.alibaba.dashscope.common.Role;
import com.alibaba.dashscope.utils.Constants;

public class ImageEditExample {
    public static void main(String[] args) {
        Constants.baseHttpApiUrl = "https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1";

        // [Method 1] Use a public image URL
        String imageUrl = "https://alidocs.oss-cn-zhangjiakou.aliyuncs.com/res/yBRq1ZPYEaXdyOdv/img/33a80a19-7ac7-4c64-b0fa-7d685b7046a0.png";

        // [Method 2] Use a Base64-encoded image
        // String imageUrl = encodeFile("/path/to/your/image.png");

        MultiModalConversation conv = new MultiModalConversation();
        MultiModalMessage userMessage = MultiModalMessage.builder()
            .role(Role.USER.getValue())
            .content(Arrays.asList(
                Collections.singletonMap("image", imageUrl),
                Collections.singletonMap("text", "Generate a sophisticated urban-style female portrait. Perfectly preserve the facial features and smooth black long hair of the young woman in the input image. Change her outfit to an elegant urban professional look. Set the scene in a modern minimalist upscale coffee shop.")
            ))
            .build();
        MultiModalConversationParam param = MultiModalConversationParam.builder()
            .apiKey(System.getenv("DASHSCOPE_API_KEY"))
            .model("qwen-image-3.0-pro")
            .messages(Arrays.asList(userMessage))
            .parameter("prompt_extend", true)
            .build();
        try {
            MultiModalConversationResult result = conv.call(param);
            System.out.println(result);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    public static String encodeFile(String filePath) {
        Path path = Paths.get(filePath);
        if (!Files.exists(path)) {
            throw new IllegalArgumentException("File does not exist: " + filePath);
        }
        String mimeType = null;
        try {
            mimeType = Files.probeContentType(path);
        } catch (IOException e) {
            throw new IllegalArgumentException("Cannot detect file type: " + filePath);
        }
        if (mimeType == null || !mimeType.startsWith("image/")) {
            throw new IllegalArgumentException("Unsupported or unrecognized image format");
        }
        byte[] fileBytes = null;
        try {
            fileBytes = Files.readAllBytes(path);
        } catch (IOException e) {
            throw new IllegalArgumentException("Cannot read file content: " + filePath);
        }
        String encodedString = Base64.getEncoder().encodeToString(fileBytes);
        return "data:" + mimeType + ";base64," + encodedString;
    }
}
```

## **Error codes**

If the model call fails and returns an error message, see [Error codes](/help/en/model-studio/error-code) for resolution.

/\* Adjust table width \*/ .aliyun-docs-content table.medium-width { max-width: 1018px; width: 100%; } .aliyun-docs-content table.table-no-border tr td:first-child { padding-left: 0; } .aliyun-docs-content table.table-no-border tr td:last-child { padding-right: 0; } /\* Support sticky positioning \*/ div:has(.aliyun-docs-content), .aliyun-docs-content .markdown-body { overflow: visible; } .stick-top { position: sticky; top: 46px; } /\*\* Code block font \*\*/ /\* Reduce code block margin in tables to make table information more compact \*/ .unionContainer .markdown-body table .help-code-block { margin: 0 !important; } /\* Reduce code block font size in tables to make table information more compact \*/ .unionContainer .markdown-body .help-code-block pre { font-size: 12px !important; } /\* Reduce code block font size in tables to make table information more compact \*/ .unionContainer .markdown-body .help-code-block pre code { font-size: 12px !important; } /\*\* API Reference tables \*\*/ .aliyun-docs-content table.api-reference tr td:first-child { margin: 0px; border-bottom: 1px solid #d8d8d8; } .aliyun-docs-content table.api-reference tr:last-child td:first-child { border-bottom: none; } .aliyun-docs-content table.api-reference p { color: #6e6e80; } .aliyun-docs-content table.api-reference b, i { color: #181818; } .aliyun-docs-content table.api-reference .collapse { border: none; margin-top: 4px; margin-bottom: 4px; } .aliyun-docs-content table.api-reference .collapse .expandable-title-bold { padding: 0; } .aliyun-docs-content table.api-reference .collapse .expandable-title { padding: 0; } .aliyun-docs-content table.api-reference .collapse .expandable-title-bold .title { margin-left: 16px; } .aliyun-docs-content table.api-reference .collapse .expandable-title .title { margin-left: 16px; } .aliyun-docs-content table.api-reference .collapse .expandable-title-bold i.icon { position: absolute; color: #777; font-weight: 100; } .aliyun-docs-content table.api-reference .collapse .expandable-title i.icon { position: absolute; color: #777; font-weight: 100; } .aliyun-docs-content table.api-reference .collapse.expanded .expandable-content { padding: 10px 14px 10px 14px !important; margin: 0; border: 1px solid #e9e9e9; } .aliyun-docs-content table.api-reference .collapse .expandable-title-bold b { font-size: 13px; font-weight: normal; color: #6e6e80; } .aliyun-docs-content table.api-reference .collapse .expandable-title b { font-size: 13px; font-weight: normal; color: #6e6e80; } .aliyun-docs-content table.api-reference .tabbed-content-box { border: none; } .aliyun-docs-content table.api-reference .tabbed-content-box section { padding: 8px 0 !important; } .aliyun-docs-content table.api-reference .tabbed-content-box.mini .tab-box { /\* position: absolute; left: 40px; right: 0; \*/ } .aliyun-docs-content .margin-top-33 { margin-top: 33px !important; } .aliyun-docs-content .two-codeblocks pre { max-height: calc(50vh - 136px) !important; height: auto; } .expandable-content section { border-bottom: 1px solid #e9e9e9; padding-top: 6px; padding-bottom: 4px; } .expandable-content section:last-child { border-bottom: none; } .expandable-content section:first-child { padding-top: 0; }

Qwen-Image is a general-purpose image generation model that supports multiple artistic styles and excels at **complex text rendering**. It handles multi-line layouts, paragraph-level text generation, and fine-grained detail rendering.

| **Quick access:** [User guide](/help/en/model-studio/text-to-image) \\| Try it online **(**[Singapore](https://modelstudio.console.alibabacloud.com/ap-southeast-1/?tab=dashboard#/efm/model_experience_center/vision?currentTab=imageGenerate&modelId=qwen-image-max) \\| [Beijing](https://bailian.console.alibabacloud.com/cn-beijing?tab=model#/efm/model_experience_center/vision?currentTab=imageGenerate&modelId=qwen-image-max)) **\\|** [Technical blog (more examples)](https://qwen.ai/blog?id=9467b4bff9c638e847f08443802c6b96ab116a87&from=research.research-list) |
| --- | --- | --- | --- |

## **Examples**

| **Prompt** | **Generated image** |
| --- | --- |
| A healing-style hand-drawn poster featuring three puppies playing with a ball on lush green grass, adorned with decorative elements such as birds and stars. The main title **“Come Play Ball!”** appears prominently at the top in bold, blue cartoon font. Below it, the subtitle **“Come \\[Show Off Your Skills\\]!”** appears in green font. A speech bubble adds playful charm with the text: **“Hehe, watch me amaze my little friends next!”** At the bottom, supplementary text reads: **“We get to play ball with our friends again!”** The color palette centers on fresh greens and blues, accented with bright pink and yellow tones to highlight a cheerful, childlike atmosphere. | ![image](https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/6492803771/p1005422.png) |

## Model overview

| **Model** | **Description** | **Output image specifications** |
| --- | --- | --- |
| qwen-image-2.0-pro `**Recommended**` > Same capabilities as qwen-image-2.0-pro-2026-04-22 | Qwen Pro series for image generation and editing. Offers stronger text rendering, realistic texture, and semantic adherence. > For image editing, see [Qwen-Image Editing](/help/en/model-studio/qwen-image-edit-api). | Resolution: Set width and height freely. Total pixels must be between 512×512 and 2048×2048. Default resolution is 2048×2048. Format: PNG Number of images: 1–6 |
| qwen-image-2.0-pro-2026-06-22 `**Recommended**` |
| qwen-image-2.0-pro-2026-04-22 |
| qwen-image-2.0-pro-2026-03-03 |
| qwen-image-2.0 `**Recommended**` > Same capabilities as qwen-image-2.0-2026-03-03 | Qwen accelerated series for image generation and editing. Balances quality and response speed. > For image editing, see [Qwen-Image Editing](/help/en/model-studio/qwen-image-edit-api). |
| qwen-image-2.0-2026-03-03 `**Recommended**` |
| qwen-image-max > Same capabilities as qwen-image-max-2025-12-30 | Qwen Max series for image generation. Delivers higher realism and naturalness, with fewer AI-generation artifacts. | Resolution: See [size parameter settings](#1c7b41f2d13sv) for supported resolutions and aspect ratios. Format: PNG Number of images: Fixed at 1 |
| qwen-image-max-2025-12-30 |
| qwen-image-plus > Same capabilities as qwen-image | Qwen Plus series for image generation. Excels at diverse artistic styles and text rendering. |
| qwen-image-plus-2026-01-09 |
| qwen-image |

> Only qwen-image-plus and qwen-image support [asynchronous calls](#0d8029dcc8pxl) .

**Note**

Before calling the API, check the [supported models list](/help/en/model-studio/models#9648161a22le8) for your region.

## Prerequisites

Before making a call, [get an API key](/help/en/model-studio/get-api-key) and [export the API key as an environment variable](/help/en/model-studio/configure-api-key-through-environment-variables). To make calls using the SDK, [install the DashScope SDK](/help/en/model-studio/install-sdk).

**Important**

The China (Beijing) and Singapore regions have separate **API keys** and **request endpoints**. They cannot be used interchangeably. Cross-region calls lead to authentication failures or service errors.

## **Synchronous API (recommended)**

### **HTTP**

Synchronous calls return results in a single request.

**Singapore:** `POST https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation`

**Beijing:** `POST https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation`

Replace `{WorkspaceId}` with your actual [workspace ID](/help/en/model-studio/obtain-the-app-id-and-workspace-id#d3eb3cd37b7fu).

| #### Request parameters | ## **Text-to-image** ``` curl --location 'https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation' \\ --header 'Content-Type: application/json' \\ --header "Authorization: Bearer $DASHSCOPE_API_KEY" \\ --data '{ "model": "qwen-image-2.0-pro", "input": { "messages": [ { "role": "user", "content": [ { "text": "Healing-style hand-drawn poster featuring three puppies playing with a ball on lush green grass, adorned with decorative elements such as birds and stars. The main title “Come Play Ball!” is prominently displayed at the top in bold, blue cartoon font. Below it, the subtitle “Come [Show Off Your Skills]!” appears in green font. A speech bubble adds playful charm with the text: “Hehe, watch me amaze my little friends next!” At the bottom, supplementary text reads: “We get to play ball with our friends again!” The color palette centers on fresh greens and blues, accented with bright pink and yellow tones to highlight a cheerful, childlike atmosphere." } ] } ] }, "parameters": { "negative_prompt": "Low resolution, low quality, distorted limbs, malformed fingers, oversaturated colors, wax-figure appearance, lack of facial detail, excessive smoothness, AI-looking artifacts, chaotic composition, blurry or warped text.", "prompt_extend": true, "watermark": false, "size": "2048*2048" } }' ``` |
| --- | --- |
| ##### Request headers |
| **Content-Type** `*string*` **(Required)** The content type of the request. Must be `application/json`. |
| **Authorization** `*string*` **(Required)** Authenticates the request with a Model Studio API key. Example: Bearer sk-xxxx. |
| ##### Request body |
| **model** `*string*` **(required)** Model name. Example: `qwen-image-2.0-pro`. |
| **input** `*object*` **(required)** Input information. **Properties** **messages** `*array*` **(required)** Array of message objects. **Only single-turn conversations are supported**, so the array must contain exactly one element. **Properties** **role** `*string*` **(required)** Message role. Set to `user`. **content** `*array*` **(required)** Array of message content objects. **Properties** **text** `*string*` **(required)** A positive prompt describing the image content, style, and composition you want. Supports Chinese and English. The `qwen-image-2.0` series accept up to 1,300 tokens. Other models accept up to 800 tokens. The system truncates excess tokens. **Note:** Only one text field is allowed. Omitting it or providing more than one returns an error. |
| **parameters** `*object*` (optional) Image processing parameters. **Properties** **negative\\_prompt** `*string*` (optional) A negative prompt describing what you do not want in the image. Supports Chinese and English. Maximum length is 500 characters. Excess characters are truncated automatically. Example: Low resolution, low quality, distorted limbs, malformed fingers, oversaturated colors, wax-like appearance, no facial details, overly smooth surfaces, AI-generated look. Chaotic composition. Blurry or distorted text. **size** `*string*` (optional) Output image resolution, formatted as `width*height`. **qwen-image-2.0 series models:** Total pixels must be between `512×512` and `2048×2048`. Default resolution is `2048×2048`. Recommended resolutions: - `2688*1536`: 16:9 - `1536*2688`: 9:16 - `2048*2048` **(default)**: 1:1 - `2368*1728`: 4:3 - `1728*2368`: 3:4 **qwen-image-max and qwen-image-plus series models:** Default resolution is `1664*928`. Supported resolutions and their aspect ratios: - `1664*928` **(default)**: 16:9 - `1472*1104`: 4:3 - `1328*1328`: 1:1 - `1104*1472`: 3:4 - `928*1664`: 9:16 **n** `*integer*` (optional) Number of output images. Default is 1. For qwen-image-2.0 series models, you can choose 1–6 images. For qwen-image-max and qwen-image-plus series models, this value is fixed at 1. Setting any other value returns an error. **prompt\\_extend** `*bool*` (optional) Enable smart prompt rewriting. The model optimizes the positive prompt. Does not affect the negative prompt. - `true`: **Default**. Enables rewriting. Use this for more diverse image content; the model adds details. - `false`: Disables rewriting. Use this for tighter control over image details. For best results, optimize your prompts based on [Text-to-image prompt guide](/help/en/model-studio/text-to-image-prompt). View rewriting examples > Only asynchronous calls return the actual rewritten prompt. **Original prompt (orig\\_prompt)**: A sitting ginger cat with a joyful expression, looking lively, adorable, and incredibly lifelike. **Actual prompt (actual\\_prompt)**: Photorealistic wildlife portrait: A sitting ginger cat with lush, sun-kissed fur and a vibrant, joyful expression, eyes sparkling with curiosity and warmth. The cat's head is slightly tilted, ears perked forward, mouth gently open in a contented, lively pose—exuding adorable charm and incredible lifelike detail. Soft natural lighting enhances the texture of each individual whisker and fur strand, with subtle highlights on the muzzle and inner ears. Background: a softly blurred autumn garden at golden hour—warm tones of amber leaves, dappled sunlight filtering through trees, and faint hints of mossy stone steps. Composition emphasizes the cat as the central focal point, captured in sharp focus with shallow depth of field. Style: ultra-realistic photography, National Geographic-level detail, 8K resolution, Canon EOS R5, f/1.2 aperture, cinematic lighting, true-to-life color grading, minimal post-processing. No text or overlays. **watermark** `*bool*` (optional) Adds a “Qwen-Image” watermark to the bottom-right corner of the image. Default: `false`. Watermark style: ![1](https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/6844029571/p1012089.jpg) **seed** `*integer*` (optional) Random number seed. Valid range: `[0,2147483647]`. Using the same `seed` yields similar outputs. If omitted, the algorithm uses a random seed. **Note:** Image generation is probabilistic. Even with the same `seed`, results may vary. |

| #### Response parameters | ## Task succeeded Image URLs are valid for only 24 hours and then automatically purged. Save generated images promptly. ``` { "output": { "choices": [ { "finish_reason": "stop", "message": { "content": [ { "image": "https://dashscope-result-sh.oss-cn-shanghai.aliyuncs.com/xxx.png?Expires=xxx" } ], "role": "assistant" } } ] }, "usage": { "height": 2048, "image_count": 1, "width": 2048 }, "request_id": "d0250a3d-b07f-49e1-bdc8-6793f4929xxx" } ``` ## Task failed If the task fails, the response includes error details in the code and message fields. See [Error codes](/help/en/model-studio/error-code). ``` { "request_id": "a4d78a5f-655f-9639-8437-xxxxxx", "code": "InvalidParameter", "message": "num_images_per_prompt must be 1" } ``` |
| --- | --- |
| **output** `*object*` Task output information. **Properties** **choices** `*array*` Model output. This array contains exactly one element. **Properties** **finish\\_reason** `*string*` Reason the task stopped. Value is `stop` for natural stops. **message** `*object*` Model response message. **Properties** **role** `*string*` Message role. Fixed value: `assistant`. **content** `*array*` **Properties** **image** `*string*` URL of the generated image (PNG format). **Expires after 24 hours**. Download and save it promptly. **task\\_metric** `*object*` Task result statistics. Not returned for qwen-image-2.0 series models. **Properties** **TOTAL** `*integer*` Total number of tasks. **SUCCEEDED** `*integer*` Number of successful tasks. **FAILED** `*integer*` Number of failed tasks. |
| **usage** `*object*` **Note** This field is only returned in async calls. Synchronous ImageSynthesis SDK calls do not return this field. Output statistics. Counts only successful results. **Properties** **image\\_count** `*integer*` Number of generated images. For qwen-image-2.0 series models this equals the requested n (1–6); for qwen-image-max and qwen-image-plus series it is fixed at 1. **width** `*integer*` Width of the generated image, in pixels. **height** `*integer*` Height of the generated image, in pixels. |
| **request\\_id** `*string*` Unique request identifier for tracing and troubleshooting. |
| **code** `*string*` Error code. Returned only for failed requests. See [Error codes](/help/en/model-studio/error-code). |
| **message** `*string*` Detailed error message. Returned only for failed requests. See [Error codes](/help/en/model-studio/error-code). |

### **DashScope SDK call**

The DashScope SDK supports Python and Java.

The parameter names in the SDK closely match the HTTP parameters, and the parameter structures follow language-specific conventions. For synchronous call parameters, see [HTTP](#90575c8228nmq).

## **Python**

**Note**

Install the latest DashScope Python SDK to avoid runtime errors: [Install SDK](/help/en/model-studio/install-sdk).

##### **Request example**

```
import json
import os
import dashscope
from dashscope import MultiModalConversation

# Singapore region. Replace {WorkspaceId} with your actual workspace ID. URLs vary by region.
dashscope.base_http_api_url = 'https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1'

messages = [
    {
        "role": "user",
        "content": [
            {"text": "Healing-style hand-drawn poster featuring three puppies playing with a ball on lush green grass, adorned with decorative elements such as birds and stars. The main title “Come Play Ball!” is prominently displayed at the top in bold, blue cartoon font. Below it, the subtitle “Come [Show Off Your Skills]!” appears in green font. A speech bubble adds playful charm with the text: “Hehe, watch me amaze my little friends next!” At the bottom, supplementary text reads: “We get to play ball with our friends again!” The color palette centers on fresh greens and blues, accented with bright pink and yellow tones to highlight a cheerful, childlike atmosphere."}
        ]
    }
]

# API keys differ between Beijing and Singapore regions. Get your API key: https://www.alibabacloud.com/help/en/model-studio/get-api-key
# If you haven't set the environment variable, replace the line below with: api_key="sk-xxx"
api_key = os.getenv("DASHSCOPE_API_KEY")

response = MultiModalConversation.call(
    api_key=api_key,
    model="qwen-image-2.0-pro",
    messages=messages,
    result_format='message',
    stream=False,
    watermark=False,
    prompt_extend=True,
    negative_prompt="Low resolution, low quality, distorted limbs, malformed fingers, oversaturated colors, wax-figure appearance, lack of facial detail, excessive smoothness, AI-looking artifacts, chaotic composition, blurry or warped text.",
    size='2048*2048'
)

if response.status_code == 200:
    print(json.dumps(response, ensure_ascii=False))
else:
    print(f"HTTP status code: {response.status_code}")
    print(f"Error code: {response.code}")
    print(f"Error message: {response.message}")
    print("See documentation: https://www.alibabacloud.com/help/en/model-studio/error-code")
```

##### **Response example**

> Image URLs expire after 24 hours. Download the images promptly.

```
{
    "status_code": 200,
    "request_id": "d2d1a8c0-325f-9b9d-8b90-xxxxxx",
    "code": "",
    "message": "",
    "output": {
        "text": null,
        "finish_reason": null,
        "choices": [
            {
                "finish_reason": "stop",
                "message": {
                    "role": "assistant",
                    "content": [
                        {
                            "image": "https://dashscope-result-wlcb.oss-cn-wulanchabu.aliyuncs.com/xxx.png?Expires=xxx"
                        }
                    ]
                }
            }
        ]
    }
}
```

## **Java**

**Note**

You must install the latest DashScope Java SDK. Otherwise, runtime errors may occur: [Install SDK](/help/en/model-studio/install-sdk).

##### **Request example**

```
import com.alibaba.dashscope.aigc.multimodalconversation.MultiModalConversation;
import com.alibaba.dashscope.aigc.multimodalconversation.MultiModalConversationParam;
import com.alibaba.dashscope.aigc.multimodalconversation.MultiModalConversationResult;
import com.alibaba.dashscope.common.MultiModalMessage;
import com.alibaba.dashscope.common.Role;
import com.alibaba.dashscope.exception.ApiException;
import com.alibaba.dashscope.exception.NoApiKeyException;
import com.alibaba.dashscope.exception.UploadFileException;
import com.alibaba.dashscope.utils.JsonUtils;
import com.alibaba.dashscope.utils.Constants;

import java.io.IOException;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

public class QwenImage {

    static {
        // Singapore region. Replace {WorkspaceId} with your actual workspace ID. URLs vary by region.
        Constants.baseHttpApiUrl = "https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1";
    }

    // API keys differ between Beijing and Singapore regions. Get your API key: https://www.alibabacloud.com/help/en/model-studio/get-api-key
    // If you haven't set the environment variable, replace the line below with: static String apiKey="sk-xxx"
    static String apiKey = System.getenv("DASHSCOPE_API_KEY");

    public static void call() throws ApiException, NoApiKeyException, UploadFileException, IOException {

        MultiModalConversation conv = new MultiModalConversation();

        MultiModalMessage userMessage = MultiModalMessage.builder().role(Role.USER.getValue())
                .content(Arrays.asList(
                        Collections.singletonMap("text", "Healing-style hand-drawn poster featuring three puppies playing with a ball on lush green grass, adorned with decorative elements such as birds and stars. The main title “Come Play Ball!” is prominently displayed at the top in bold, blue cartoon font. Below it, the subtitle “Come [Show Off Your Skills]!” appears in green font. A speech bubble adds playful charm with the text: “Hehe, watch me amaze my little friends next!” At the bottom, supplementary text reads: “We get to play ball with our friends again!” The color palette centers on fresh greens and blues, accented with bright pink and yellow tones to highlight a cheerful, childlike atmosphere.")
                )).build();

        Map<String, Object> parameters = new HashMap<>();
        parameters.put("watermark", false);
        parameters.put("prompt_extend", true);
        parameters.put("negative_prompt", "Low resolution, low quality, distorted limbs, malformed fingers, oversaturated colors, wax-figure appearance, lack of facial detail, excessive smoothness, AI-looking artifacts, chaotic composition, blurry or warped text.");
        parameters.put("size", "2048*2048");

        MultiModalConversationParam param = MultiModalConversationParam.builder()
                .apiKey(apiKey)
                .model("qwen-image-2.0-pro")
                .messages(Collections.singletonList(userMessage))
                .parameters(parameters)
                .build();

        MultiModalConversationResult result = conv.call(param);
        System.out.println(JsonUtils.toJson(result));
    }

    public static void main(String[] args) {
        try {
            call();
        } catch (ApiException | NoApiKeyException | UploadFileException | IOException e) {
            System.out.println(e.getMessage());
        }
        System.exit(0);
    }
}
```

##### **Response example**

> Image URLs expire after 24 hours. Download the images promptly.

```
{
    "requestId": "5b6f2d04-b019-40db-a5cc-xxxxxx",
    "output": {
        "choices": [
            {
                "finish_reason": "stop",
                "message": {
                    "role": "assistant",
                    "content": [
                        {
                            "image": "https://dashscope-result-wlcb.oss-cn-wulanchabu.aliyuncs.com/xxx.png?Expires=xxx"
                        }
                    ]
                }
            }
        ]
    }
}
```

## **Asynchronous API**

**Important**

Only qwen-image-plus and qwen-image support asynchronous calls.

### **HTTP**

Asynchronous calls use a two-step HTTP workflow:

1.  **Create a task to get a task ID:** Send a request to create a task. The response returns a **task ID** (task\_id).
    
2.  **Poll for results using the task ID:** Poll the task status with the task\_id until it completes and returns an image URL.
    

#### **Step 1: Create a task to get a task ID**

**Singapore:** `POST https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis`

**Beijing:** `POST https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis`

**Note**

-   After the task is created, use the returned `task_id` to query the result. The `task_id` is valid for 24 hours. **Do not create duplicate tasks**. Instead, use polling to retrieve the result.
    
-   For guidance for beginners, see [Call APIs with Postman or cURL](/help/en/model-studio/first-call-to-image-and-video-api).
    

| ##### **Request parameters** | ## Text-to-image Only `qwen-image-plus` and `qwen-image` support asynchronous calls. ``` curl -X POST https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis \\ -H 'X-DashScope-Async: enable' \\ -H "Authorization: Bearer $DASHSCOPE_API_KEY" \\ -H 'Content-Type: application/json' \\ -d '{ "model": "qwen-image-plus", "input": { "prompt": "Healing-style hand-drawn poster featuring three puppies playing with a ball on lush green grass, adorned with decorative elements such as birds and stars. The main title “Come Play Ball!” is prominently displayed at the top in bold, blue cartoon font. Below it, the subtitle “Come [Show Off Your Skills]!” appears in green font. A speech bubble adds playful charm with the text: “Hehe, watch me amaze my little friends next!” At the bottom, supplementary text reads: “We get to play ball with our friends again!” The color palette centers on fresh greens and blues, accented with bright pink and yellow tones to highlight a cheerful, childlike atmosphere." }, "parameters": { "negative_prompt":" ", "size": "1664*928", "n": 1, "prompt_extend": true, "watermark": false } }' ``` |
| --- | --- |
| ###### **Request headers** |
| **Content-Type** `*string*` **(Required)** The content type of the request. Must be `application/json`. |
| **Authorization** `*string*` **(Required)** Authenticates the request with a Model Studio API key. Example: Bearer sk-xxxx. |
| **X-DashScope-Async** `*string*` **(Required)** Enables asynchronous processing. HTTP requests support only asynchronous calls. Must be `enable`. **Important** If this request header is missing, the error "current user api does not support synchronous calls" is returned. |
| ###### **Request body** |
| **model** `*string*` **(required)** Model name. Only `qwen-image-plus` and `qwen-image` support asynchronous calls. Example: `qwen-image-plus`. |
| **input** `*object*` **(required)** Input information. **Properties** **prompt** `*string*` **(required)** A positive prompt describing the visual elements and characteristics you want in the generated image. Supports Chinese and English. Maximum length is 800 characters. Each Chinese character, letter, digit, or symbol counts as one character. Excess characters are truncated automatically. Example: A sitting orange cat with a joyful expression, lively and adorable, highly realistic. **negative\\_prompt** `*string*` (optional) A negative prompt describing what you do not want in the image. Supports Chinese and English. Maximum length is 500 characters. Excess characters are truncated automatically. Example: Low resolution, low quality, distorted limbs, malformed fingers, oversaturated colors, wax-like appearance, no facial details, overly smooth surfaces, AI-generated look. Chaotic composition. Blurry or distorted text. |
| **parameters** `*object*` (optional) Image processing parameters. **Properties** **size** `*string*` (optional) Output image resolution, formatted as `width*height`. **qwen-image-2.0 series models:** Total pixels must be between `512×512` and `2048×2048`. Default resolution is `2048×2048`. Recommended resolutions: - `2688*1536`: 16:9 - `1536*2688`: 9:16 - `2048*2048` **(default)**: 1:1 - `2368*1728`: 4:3 - `1728*2368`: 3:4 **qwen-image-max and qwen-image-plus series models:** Default resolution is `1664*928`. Supported resolutions and their aspect ratios: - `1664*928` **(default)**: 16:9 - `1472*1104`: 4:3 - `1328*1328`: 1:1 - `1104*1472`: 3:4 - `928*1664`: 9:16 **n** `*integer*` (optional) Number of generated images. **This value is fixed at 1. Setting any other value returns an error.** **prompt\\_extend** `*bool*` (optional) Enable smart prompt rewriting. The model optimizes the positive prompt. Does not affect the negative prompt. - `true`: **Default**. Enables rewriting. Use this for more diverse image content; the model adds details. - `false`: Disables rewriting. Use this for tighter control over image details. For best results, optimize your prompts based on [Text-to-image prompt guide](/help/en/model-studio/text-to-image-prompt). View rewriting examples > Only asynchronous calls return the actual rewritten prompt. **Original prompt (orig\\_prompt)**: A sitting ginger cat with a joyful expression, looking lively, adorable, and incredibly lifelike. **Actual prompt (actual\\_prompt)**: Photorealistic wildlife portrait: A sitting ginger cat with lush, sun-kissed fur and a vibrant, joyful expression, eyes sparkling with curiosity and warmth. The cat's head is slightly tilted, ears perked forward, mouth gently open in a contented, lively pose—exuding adorable charm and incredible lifelike detail. Soft natural lighting enhances the texture of each individual whisker and fur strand, with subtle highlights on the muzzle and inner ears. Background: a softly blurred autumn garden at golden hour—warm tones of amber leaves, dappled sunlight filtering through trees, and faint hints of mossy stone steps. Composition emphasizes the cat as the central focal point, captured in sharp focus with shallow depth of field. Style: ultra-realistic photography, National Geographic-level detail, 8K resolution, Canon EOS R5, f/1.2 aperture, cinematic lighting, true-to-life color grading, minimal post-processing. No text or overlays. **watermark** `*bool*` (optional) Adds a “Qwen-Image” watermark to the bottom-right corner of the image. Default: `false`. Watermark style: ![1](https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/6844029571/p1012089.jpg) **seed** `*integer*` (optional) Random number seed. Valid range: `[0,2147483647]`. Using the same `seed` yields similar outputs. If omitted, the algorithm uses a random seed. **Note:** Image generation is probabilistic. Even with the same `seed`, results may vary. |

| ##### **Response parameters** | #### Successful response Save the `task_id` to query the task status and result. ``` { "output": { "task_status": "PENDING", "task_id": "0385dc79-5ff8-4d82-bcb6-xxxxxx" }, "request_id": "4909100c-7b5a-9f92-bfe5-xxxxxx" } ``` #### Error response Task creation failed. See [Error codes](/help/en/model-studio/error-code). ``` { "code": "InvalidApiKey", "message": "No API-key provided.", "request_id": "7438d53d-6eb8-4596-8835-xxxxxx" } ``` |
| --- | --- |
| **output** `*object*` Task output information. **Properties** **task\\_id** `*string*` The task ID. Valid for queries for 24 hours. **task\\_status** `*string*` The status of the task. **Enumeration values** - PENDING - RUNNING - SUCCEEDED - FAILED - CANCELED - UNKNOWN: The task does not exist or its status is unknown. |
| **request\\_id** `*string*` Unique request identifier for tracing and troubleshooting. |
| **code** `*string*` Error code. Returned only for failed requests. See [Error codes](/help/en/model-studio/error-code). |
| **message** `*string*` Detailed error message. Returned only for failed requests. See [Error codes](/help/en/model-studio/error-code). |

#### **Step 2: Poll for results using the task ID**

##### **Singapore**

`GET https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/tasks/{task_id}`

When calling, replace `{WorkspaceId}` with your actual [workspace ID](/help/en/model-studio/obtain-the-app-id-and-workspace-id#d3eb3cd37b7fu).

##### China (Beijing)

`GET https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api/v1/tasks/{task_id}`

When calling, replace `{WorkspaceId}` with your actual [workspace ID](/help/en/model-studio/obtain-the-app-id-and-workspace-id#d3eb3cd37b7fu).

**Note**

-   **Polling recommendation**: Image generation is time-consuming. Use a polling mechanism with a reasonable interval, such as 10 seconds.
    
-   **Task state transition**: PENDING → RUNNING → SUCCEEDED or FAILED.
    
-   **Result link**: After a task succeeds, an image URL valid for **24 hours** is returned. Download and save the image to permanent storage, such as [OSS](/help/en/oss/user-guide/what-is-oss).
    

| ##### **Request parameters** | ## Poll for task results Replace `{task_id}` with the `task_id` value returned by the previous API call. The `task_id` is valid for queries for 24 hours, Replace `{WorkspaceId}` with your actual [workspace ID](/help/en/model-studio/obtain-the-app-id-and-workspace-id#d3eb3cd37b7fu). ``` curl -X GET https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/tasks/{task_id} \\ --header "Authorization: Bearer $DASHSCOPE_API_KEY" ``` |
| --- | --- |
| ###### **Request headers** |
| **Authorization** `*string*` **(Required)** Authenticates the request with a Model Studio API key. Example: Bearer sk-xxxx. |
| ###### **URL path parameters** |
| **task\\_id** `*string*` **(Required)** The ID of the task. |

| ##### **Response parameters** | ## Task succeeded Task data (task status and image URLs) is retained for only 24 hours and then automatically purged. Save generated images promptly. ``` { "request_id": "7434edb2-3cba-44e6-a772-xxxxxx", "output": { "task_id": "878f591e-ebdf-4e45-97eb-xxxxxx", "task_status": "SUCCEEDED", "submit_time": "2025-09-09 11:38:54.741", "scheduled_time": "2025-09-09 11:38:54.781", "end_time": "2025-09-09 11:39:19.484", "results": [ { "orig_prompt": "Healing-style hand-drawn poster featuring three puppies playing with a ball on lush green grass, adorned with decorative elements such as birds and stars. The main title “Come Play Ball!” is prominently displayed at the top in bold, blue cartoon font. Below it, the subtitle “Come [Show Off Your Skills]!” appears in green font. A speech bubble adds playful charm with the text: “Hehe, watch me amaze my little friends next!” At the bottom, supplementary text reads: “We get to play ball with our friends again!” The color palette centers on fresh greens and blues, accented with bright pink and yellow tones to highlight a cheerful, childlike atmosphere.", "actual_prompt": "Childhood-inspired hand-drawn poster design: Three playful puppies joyfully interact with a colorful ball on a vibrant patch of lush green grass. Delicate decorative elements including fluttering birds and twinkling stars are scattered throughout. At the top center, the bold, blue cartoon-style title “Come Play Ball!” stands out prominently. Directly beneath, the subtitle “Come [Show Off Your Skills]!” is rendered in cheerful green lettering. A whimsical speech bubble near one of the puppies contains the playful text: “Hehe, watch me amaze my little friends next!” At the bottom edge, smaller supplementary text reads: “We get to play ball with our friends again!” The color palette is centered on fresh greens and sky blues, accented with pops of bright pink and sunny yellow, enhancing the cheerful, childlike atmosphere. Style evokes nostalgic, hand-inked illustrations with soft textures, gentle linework, and a whimsical, storybook-like composition.", "url": "https://dashscope-result-sz.oss-cn-shenzhen.aliyuncs.com/7d/xxx.png?Expires=xxxx" } ] }, "usage": { "image_count": 1 } } ``` ## Task failed When a task fails, `task_status` is FAILED with an error code and message. See [Error codes](/help/en/model-studio/error-code). ``` { "request_id": "c61fe158-c0de-40f0-b4d9-964625119ba4", "output": { "task_id": "86ecf553-d340-4e21-xxxxxxxxx", "task_status": "FAILED", "submit_time": "2025-11-11 11:46:28.116", "scheduled_time": "2025-11-11 11:46:28.154", "end_time": "2025-11-11 11:46:28.255", "code": "InvalidParameter", "message": "xxxxxxxx" } } ``` |
| --- | --- |
| **output** `*object*` Task output information. **Properties** **task\\_id** `*string*` The task ID. Valid for queries for 24 hours. **task\\_status** `*string*` The status of the task. **Enumeration values** - PENDING - RUNNING - SUCCEEDED - FAILED - CANCELED - UNKNOWN: The task does not exist or its status is unknown. **submit\\_time** `*string*` The time when the task was submitted. The time is in UTC+8 and the format is YYYY-MM-DD HH:mm:ss.SSS. **scheduled\\_time** `*string*` The time when the task was executed. The time is in UTC+8 and the format is YYYY-MM-DD HH:mm:ss.SSS. **end\\_time** `*string*` The time when the task was completed. The time is in UTC+8 and the format is YYYY-MM-DD HH:mm:ss.SSS. **results** `*array*` List of task results, including image URLs, prompts, and error messages for failed tasks. **Properties** **orig\\_prompt** `*string*` The original input prompt, corresponding to the request parameter `prompt`. **actual\\_prompt** `*string*` The optimized prompt used when prompt rewriting is enabled. Not returned when disabled. **url** `*string*` URL of the generated image. Expires after 24 hours. Download and save the image promptly. **code** `*string*` Error code. Returned only for failed requests. See [Error codes](/help/en/model-studio/error-code). **message** `*string*` Detailed error message. Returned only for failed requests. See [Error codes](/help/en/model-studio/error-code). |
| **usage** `*object*` Output statistics. Counts only successful results. **Properties** **image\\_count** `*integer*` Number of generated images. For qwen-image-2.0 series models this equals the requested n (1–6); for qwen-image-max and qwen-image-plus series it is fixed at 1. |
| **request\\_id** `*string*` Unique request identifier for tracing and troubleshooting. |

### **DashScope SDK**

The DashScope SDK supports [Python](#a3ad9a3b6d9if) and [Java](#589b80853e6rn).

SDK parameter names closely match their HTTP counterparts. Parameter structures follow language-specific conventions. For asynchronous call parameters, see [HTTP](#42703589880ts).

Image models require longer processing times, so the underlying service uses asynchronous execution. The SDK provides two modes:

-   **Synchronous call (blocking mode):** The SDK waits for the task to complete and returns the final result. This matches standard synchronous call behavior.
    
-   **Asynchronous call (non-blocking mode):** The call returns immediately with a task ID. Poll for the task status and final result using that ID.
    

#### **Python SDK**

**Note**

Install the latest DashScope Python SDK to avoid runtime errors: [Install SDK](/help/en/model-studio/install-sdk).

## **Synchronous**

##### **Request example**

```
from http import HTTPStatus
from urllib.parse import urlparse, unquote
from pathlib import PurePosixPath
import requests
from dashscope import ImageSynthesis
import os
import dashscope

# Singapore region. Replace {WorkspaceId} with your actual workspace ID. URLs vary by region.
dashscope.base_http_api_url = 'https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1'

prompt = "Healing-style hand-drawn poster featuring three puppies playing with a ball on lush green grass, adorned with decorative elements such as birds and stars. The main title “Come Play Ball!” is prominently displayed at the top in bold, blue cartoon font. Below it, the subtitle “Come [Show Off Your Skills]!” appears in green font. A speech bubble adds playful charm with the text: “Hehe, watch me amaze my little friends next!” At the bottom, supplementary text reads: “We get to play ball with our friends again!” The color palette centers on fresh greens and blues, accented with bright pink and yellow tones to highlight a cheerful, childlike atmosphere."

# API keys differ between Beijing and Singapore regions. Get your API key: https://www.alibabacloud.com/help/en/model-studio/get-api-key
# If you haven't set the environment variable, replace the line below with: api_key="sk-xxx"
api_key = os.getenv("DASHSCOPE_API_KEY")

print('----Sync call, please wait a moment----')
rsp = ImageSynthesis.call(api_key=api_key,
                          model="qwen-image-plus", # Only qwen-image-plus and qwen-image support asynchronous calls
                          prompt=prompt,
                          negative_prompt=" ",
                          n=1,
                          size='1664*928',
                          prompt_extend=True,
                          watermark=False)
print(f'response: {rsp}')
if rsp.status_code == HTTPStatus.OK:
    # Save image in current directory
    for result in rsp.output.results:
        file_name = PurePosixPath(unquote(urlparse(result.url).path)).parts[-1]
        with open('./%s' % file_name, 'wb+') as f:
            f.write(requests.get(result.url).content)
else:
    print(f'Sync call failed, status_code: {rsp.status_code}, code: {rsp.code}, message: {rsp.message}')
```

##### Response example

> URLs expire after 24 hours. Download images promptly.

```
{
    "status_code": 200,
    "request_id": "a47b1a65-7041-4565-9068-xxxxxx",
    "code": null,
    "message": "",
    "output": {
        "task_id": "91093132-475e-43cf-b94e-xxxxxx",
        "task_status": "SUCCEEDED",
        "results": [
            {
                "url": "https://dashscope-result-sz.oss-cn-shenzhen.aliyuncs.com/xxx.png?Expires=xxxxxx",
                "orig_prompt": "Healing-style hand-drawn poster featuring three puppies playing with a ball on lush green grass, adorned with decorative elements such as birds and stars. The main title “Come Play Ball!” is prominently displayed at the top in bold, blue cartoon font. Below it, the subtitle “Come [Show Off Your Skills]!” appears in green font. A speech bubble adds playful charm with the text: “Hehe, watch me amaze my little friends next!” At the bottom, supplementary text reads: “We get to play ball with our friends again!” The color palette centers on fresh greens and blues, accented with bright pink and yellow tones to highlight a cheerful, childlike atmosphere.",
                "actual_prompt": "Childhood-inspired hand-drawn poster design: Three playful puppies joyfully interact with a colorful ball on a vibrant patch of lush green grass. Delicate decorative elements including fluttering birds and twinkling stars are scattered throughout. At the top center, the bold, blue cartoon-style title “Come Play Ball!” stands out prominently. Directly beneath, the subtitle “Come [Show Off Your Skills]!” is rendered in cheerful green lettering. A whimsical speech bubble near one of the puppies contains the playful text: “Hehe, watch me amaze my little friends next!” At the bottom edge, smaller supplementary text reads: “We get to play ball with our friends again!” The color palette is centered on fresh greens and sky blues, accented with pops of bright pink and sunny yellow, enhancing the cheerful, childlike atmosphere. Style evokes nostalgic, hand-inked illustrations with soft textures, gentle linework, and a whimsical, storybook-like composition."
            }
        ],
        "submit_time": "2025-09-09 13:39:20.659",
        "scheduled_time": "2025-09-09 13:39:20.717",
        "end_time": "2025-09-09 13:39:45.233"
    },
    "usage": {
        "image_count": 1
    }
}
```

## **Asynchronous**

##### Request example

```
from http import HTTPStatus
from urllib.parse import urlparse, unquote
from pathlib import PurePosixPath
import requests
from dashscope import ImageSynthesis
import os
import dashscope
import time

# Singapore region. Replace {WorkspaceId} with your actual workspace ID. URLs vary by region.
dashscope.base_http_api_url = 'https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1'

prompt = "Healing-style hand-drawn poster featuring three puppies playing with a ball on lush green grass, adorned with decorative elements such as birds and stars. The main title “Come Play Ball!” is prominently displayed at the top in bold, blue cartoon font. Below it, the subtitle “Come [Show Off Your Skills]!” appears in green font. A speech bubble adds playful charm with the text: “Hehe, watch me amaze my little friends next!” At the bottom, supplementary text reads: “We get to play ball with our friends again!” The color palette centers on fresh greens and blues, accented with bright pink and yellow tones to highlight a cheerful, childlike atmosphere."

# API keys differ between Beijing and Singapore regions. Get your API key: https://www.alibabacloud.com/help/en/model-studio/get-api-key
# If you haven't set the environment variable, replace the line below with: api_key="sk-xxx"
api_key = os.getenv("DASHSCOPE_API_KEY")

def async_call():
    print('----Creating Task----')
    task_info = create_async_task()
    print('----Polling Task Status----')
    poll_task_status(task_info)

# Create asynchronous task
def create_async_task():
    rsp = ImageSynthesis.async_call(api_key=api_key,
                                    model="qwen-image-plus", # Only qwen-image-plus and qwen-image support asynchronous calls
                                    prompt=prompt,
                                    negative_prompt=" ",
                                    n=1,
                                    size='1664*928',
                                    prompt_extend=True,
                                    watermark=False)
    print(rsp)
    if rsp.status_code == HTTPStatus.OK:
        print(rsp.output)
    else:
        print(f'Failed to create task, status_code: {rsp.status_code}, code: {rsp.code}, message: {rsp.message}')
    return rsp

# Poll asynchronous task status, query every 5 seconds, maximum polling for 1 minute
def poll_task_status(task):
    start_time = time.time()
    timeout = 60  # 1 minute timeout
    
    while True:
        # Check if timeout
        if time.time() - start_time > timeout:
            print('Polling timeout (1 minute), task not completed')
            return
            
        # Get task status
        status_rsp = ImageSynthesis.fetch(task)
        print(f'Task status query result: {status_rsp}')
        
        if status_rsp.status_code != HTTPStatus.OK:
            print(f'Failed to get task status, status_code: {status_rsp.status_code}, code: {status_rsp.code}, message: {status_rsp.message}')
            return
        task_status = status_rsp.output.task_status
        print(f'Current task status: {task_status}')
        
        if task_status == 'SUCCEEDED':
            print('Task completed, downloading image...')
            for result in status_rsp.output.results:
                file_name = PurePosixPath(unquote(urlparse(result.url).path)).parts[-1]
                with open(f'./{file_name}', 'wb+') as f:
                    f.write(requests.get(result.url).content)
                print(f'Image saved as: {file_name}')
            break
        elif task_status == 'FAILED':
            print(f'Task execution failed, status: {task_status}, code: {status_rsp.code}, message: {status_rsp.message}')
            break
        elif task_status == 'PENDING' or task_status == 'RUNNING':
            print('Task in progress, continue querying after 5 seconds...')
            time.sleep(5)
        else:
            print(f'Unknown task status: {task_status}, continue querying after 5 seconds...')
            time.sleep(5)

# Cancel asynchronous task, only tasks in PENDING status can be canceled
def cancel_task(task):
    rsp = ImageSynthesis.cancel(task)
    print(rsp)
    if rsp.status_code == HTTPStatus.OK:
        print(rsp.output.task_status)
    else:
        print(f'Failed to cancel task, status_code: {rsp.status_code}, code: {rsp.code}, message: {rsp.message}')

if __name__ == '__main__':
    async_call()
```

##### **Response example**

1.  Response for task creation
    
    ```
    {
    	"status_code": 200,
    	"request_id": "31b04171-011c-96bd-ac00-xxxxxx",
    	"code": "",
    	"message": "",
    	"output": {
    		"task_id": "4f90cf14-a34e-4eae-xxxxxxxx",
    		"task_status": "PENDING",
    		"results": []
    	},
    	"usage": null
    }
    ```
    
2.  Response for polling task results
    
    > URLs expire after 24 hours. Download images promptly.
    
    ```
    {
        "status_code": 200,
        "request_id": "a47b1a65-7041-4565-9068-xxxxxx",
        "code": null,
        "message": "",
        "output": {
            "task_id": "91093132-475e-43cf-b94e-xxxxxx",
            "task_status": "SUCCEEDED",
            "results": [
                {
                    "url": "https://dashscope-result-sz.oss-cn-shenzhen.aliyuncs.com/xxx.png?Expires=xxxxxx",
                    "orig_prompt": "Healing-style hand-drawn poster featuring three puppies playing with a ball on lush green grass, adorned with decorative elements such as birds and stars. The main title “Come Play Ball!” is prominently displayed at the top in bold, blue cartoon font. Below it, the subtitle “Come [Show Off Your Skills]!” appears in green font. A speech bubble adds playful charm with the text: “Hehe, watch me amaze my little friends next!” At the bottom, supplementary text reads: “We get to play ball with our friends again!” The color palette centers on fresh greens and blues, accented with bright pink and yellow tones to highlight a cheerful, childlike atmosphere.",
                    "actual_prompt": "Childhood-inspired hand-drawn poster design: Three playful puppies joyfully interact with a colorful ball on a vibrant patch of lush green grass. Delicate decorative elements including fluttering birds and twinkling stars are scattered throughout. At the top center, the bold, blue cartoon-style title “Come Play Ball!” stands out prominently. Directly beneath, the subtitle “Come [Show Off Your Skills]!” is rendered in cheerful green lettering. A whimsical speech bubble near one of the puppies contains the playful text: “Hehe, watch me amaze my little friends next!” At the bottom edge, smaller supplementary text reads: “We get to play ball with our friends again!” The color palette is centered on fresh greens and sky blues, accented with pops of bright pink and sunny yellow, enhancing the cheerful, childlike atmosphere. Style evokes nostalgic, hand-inked illustrations with soft textures, gentle linework, and a whimsical, storybook-like composition."
                }
            ],
            "submit_time": "2025-09-09 13:39:20.659",
            "scheduled_time": "2025-09-09 13:39:20.717",
            "end_time": "2025-09-09 13:39:45.233"
        },
        "usage": {
            "image_count": 1
        }
    }
    ```
    

#### **Java SDK**

**Note**

You must install the latest DashScope Java SDK. Otherwise, runtime errors may occur: [Install SDK](/help/en/model-studio/install-sdk).

## **Synchronous**

##### Request example

```
// Copyright (c) Alibaba, Inc. and its affiliates.

import com.alibaba.dashscope.aigc.imagesynthesis.ImageSynthesis;
import com.alibaba.dashscope.aigc.imagesynthesis.ImageSynthesisListResult;
import com.alibaba.dashscope.aigc.imagesynthesis.ImageSynthesisParam;
import com.alibaba.dashscope.aigc.imagesynthesis.ImageSynthesisResult;
import com.alibaba.dashscope.exception.ApiException;
import com.alibaba.dashscope.exception.NoApiKeyException;
import com.alibaba.dashscope.task.AsyncTaskListParam;
import com.alibaba.dashscope.utils.Constants;
import com.alibaba.dashscope.utils.JsonUtils;
import java.util.HashMap;
import java.util.Map;

public class Text2Image {
    static {
        // Singapore region. Replace {WorkspaceId} with your actual workspace ID. URLs vary by region.
        Constants.baseHttpApiUrl = "https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1";
    }

    // API keys differ between Beijing and Singapore regions. Get your API key: https://www.alibabacloud.com/help/en/model-studio/get-api-key
    // If you haven't set the environment variable, replace the line below with: static String apiKey = "sk-xxx"
    static String apiKey = System.getenv("DASHSCOPE_API_KEY");

    public static void basicCall() throws ApiException, NoApiKeyException {
        String prompt = "Healing-style hand-drawn poster featuring three puppies playing with a ball on lush green grass, adorned with decorative elements such as birds and stars. The main title “Come Play Ball!” is prominently displayed at the top in bold, blue cartoon font. Below it, the subtitle “Come [Show Off Your Skills]!” appears in green font. A speech bubble adds playful charm with the text: “Hehe, watch me amaze my little friends next!” At the bottom, supplementary text reads: “We get to play ball with our friends again!” The color palette centers on fresh greens and blues, accented with bright pink and yellow tones to highlight a cheerful, childlike atmosphere.";
        Map<String, Object> parameters = new HashMap<>();
        parameters.put("prompt_extend", true);
        parameters.put("watermark", false);
        parameters.put("negative_prompt", " ");
        ImageSynthesisParam param =
                ImageSynthesisParam.builder()
                        .apiKey(apiKey)
                        // Only qwen-image-plus and qwen-image support asynchronous calls
                        .model("qwen-image-plus")
                        .prompt(prompt)
                        .n(1)
                        .size("1664*928")
                        .parameters(parameters)
                        .build();

        ImageSynthesis imageSynthesis = new ImageSynthesis();
        ImageSynthesisResult result = null;
        try {
            System.out.println("---Sync call, please wait a moment----");
            result = imageSynthesis.call(param);
        } catch (ApiException | NoApiKeyException e){
            throw new RuntimeException(e.getMessage());
        }
        System.out.println(JsonUtils.toJson(result));
    }

    public static void main(String[] args){
        try{
            basicCall();
        }catch(ApiException|NoApiKeyException e){
            System.out.println(e.getMessage());
        }
    }
}
```

##### **Response example**

> URLs expire after 24 hours. Download images promptly.

```
{
    "request_id": "9f3044ba-528f-4606-8830-xxxxxx",
    "output": {
        "task_id": "fecf4c7f-3508-45f4-8454-xxxxxx",
        "task_status": "SUCCEEDED",
        "results": [
            {
                "orig_prompt": "Healing-style hand-drawn poster featuring three puppies playing with a ball on lush green grass, adorned with decorative elements such as birds and stars. The main title “Come Play Ball!” is prominently displayed at the top in bold, blue cartoon font. Below it, the subtitle “Come [Show Off Your Skills]!” appears in green font. A speech bubble adds playful charm with the text: “Hehe, watch me amaze my little friends next!” At the bottom, supplementary text reads: “We get to play ball with our friends again!” The color palette centers on fresh greens and blues, accented with bright pink and yellow tones to highlight a cheerful, childlike atmosphere.",
                "actual_prompt": "Childhood-inspired hand-drawn poster design: Three playful puppies joyfully interact with a colorful ball on a vibrant patch of lush green grass. Delicate decorative elements including fluttering birds and twinkling stars are scattered throughout. At the top center, the bold, blue cartoon-style title “Come Play Ball!” stands out prominently. Directly beneath, the subtitle “Come [Show Off Your Skills]!” is rendered in cheerful green lettering. A whimsical speech bubble near one of the puppies contains the playful text: “Hehe, watch me amaze my little friends next!” At the bottom edge, smaller supplementary text reads: “We get to play ball with our friends again!” The color palette is centered on fresh greens and sky blues, accented with pops of bright pink and sunny yellow, enhancing the cheerful, childlike atmosphere. Style evokes nostalgic, hand-inked illustrations with soft textures, gentle linework, and a whimsical, storybook-like composition.",
                "url": "https://dashscope-result-sz.oss-cn-shenzhen.aliyuncs.com/xxx.png?Expires=xxxx"
            }
        ]
    },
    "usage": {
        "image_count": 1
    }
}
```

## **Asynchronous**

##### Request example

```
// Copyright (c) Alibaba, Inc. and its affiliates.

import com.alibaba.dashscope.aigc.imagesynthesis.ImageSynthesis;
import com.alibaba.dashscope.aigc.imagesynthesis.ImageSynthesisParam;
import com.alibaba.dashscope.aigc.imagesynthesis.ImageSynthesisResult;
import com.alibaba.dashscope.exception.ApiException;
import com.alibaba.dashscope.exception.NoApiKeyException;
import com.alibaba.dashscope.utils.Constants;
import com.alibaba.dashscope.utils.JsonUtils;
import java.util.HashMap;
import java.util.Map;

public class Text2Image {

    static {
        // Singapore region. Replace {WorkspaceId} with your actual workspace ID. URLs vary by region.
        Constants.baseHttpApiUrl = "https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1";
    }

    // API keys differ between Beijing and Singapore regions. Get your API key: https://www.alibabacloud.com/help/en/model-studio/get-api-key
    // If you haven't set the environment variable, replace the line below with: static String apiKey = "sk-xxx"
    static String apiKey = System.getenv("DASHSCOPE_API_KEY");

    public void asyncCall() {
        System.out.println("---Creating task----");
        String taskId = this.createAsyncTask();
        System.out.println("--Waiting for task to complete and return image url----");
        this.waitAsyncTask(taskId);
    }

    public String createAsyncTask() {
        String prompt = "Healing-style hand-drawn poster featuring three puppies playing with a ball on lush green grass, adorned with decorative elements such as birds and stars. The main title “Come Play Ball!” is prominently displayed at the top in bold, blue cartoon font. Below it, the subtitle “Come [Show Off Your Skills]!” appears in green font. A speech bubble adds playful charm with the text: “Hehe, watch me amaze my little friends next!” At the bottom, supplementary text reads: “We get to play ball with our friends again!” The color palette centers on fresh greens and blues, accented with bright pink and yellow tones to highlight a cheerful, childlike atmosphere.";
        Map<String, Object> parameters = new HashMap<>();
        parameters.put("prompt_extend", true);
        parameters.put("watermark", false);
        parameters.put("negative_prompt", " ");
        ImageSynthesisParam param =
                ImageSynthesisParam.builder()
                        .apiKey(apiKey)
                        // Only qwen-image-plus and qwen-image support asynchronous calls
                        .model("qwen-image-plus")
                        .prompt(prompt)
                        .n(1)
                        .size("1664*928")
                        .parameters(parameters)
                        .build();

        try {
            ImageSynthesisResult result = new ImageSynthesis().asyncCall(param);
            System.out.println(JsonUtils.toJson(result));
            String taskId = result.getOutput().getTaskId();
            System.out.println("task_id=" + taskId);
            return taskId;
        } catch (Exception e) {
            throw new RuntimeException(e.getMessage());
        }
    }

    public void waitAsyncTask(String taskId) {
        ImageSynthesis imageSynthesis = new ImageSynthesis();
        long startTime = System.currentTimeMillis();
        int timeout = 60 * 1000; // 1 minute timeout
        int interval = 5 * 1000;  // 5 second polling interval

        while (true) {
            if (System.currentTimeMillis() - startTime > timeout) {
                System.out.println("Polling timed out (1 minute), task not completed");
                return;
            }

            try {
                ImageSynthesisResult result = imageSynthesis.fetch(taskId, apiKey);
                System.out.println("Task status query result: " + JsonUtils.toJson(result));
                if (result.getOutput() == null) {
                    System.out.println("Failed to get task status, output is empty");
                    return;
                }
                String taskStatus = result.getOutput().getTaskStatus();
                System.out.println("Current task status: " + taskStatus);
                switch (taskStatus) {
                    case "SUCCEEDED":
                        System.out.println("Task completed");
                        System.out.println(JsonUtils.toJson(result));
                        return;
                    case "FAILED":
                        System.out.println("Task execution failed, status: " + taskStatus);
                        return;
                    case "PENDING":
                    case "RUNNING":
                        System.out.println("Task in progress, querying again in 5 seconds...");
                        Thread.sleep(interval);
                        break;
                    default:
                        System.out.println("Unknown task status: " + taskStatus + ", querying again in 5 seconds...");
                        Thread.sleep(interval);
                        break;
                }
            } catch (ApiException | NoApiKeyException e) {
                System.err.println("API call exception: " + e.getMessage());
                return;
            } catch (InterruptedException e) {
                System.err.println("Thread interruption exception: " + e.getMessage());
                Thread.currentThread().interrupt();
                return;
            }
        }
    }
    
    public static void main(String[] args){
        Text2Image text2Image = new Text2Image();
        text2Image.asyncCall();
    }
}
```

##### Response example

1.  Response for task creation
    
    ```
    {
    	"request_id": "5dbf9dc5-4f4c-9605-85ea-542f97709ba8",
    	"output": {
    		"task_id": "7277e20e-aa01-4709-xxxxxxxx",
    		"task_status": "PENDING"
    	}
    }
    ```
    
2.  Response for polling task results
    
    > URLs expire after 24 hours. Download images promptly.
    
    ```
    {
        "request_id": "9f3044ba-528f-4606-8830-xxxxxx",
        "output": {
            "task_id": "fecf4c7f-3508-45f4-8454-xxxxxx",
            "task_status": "SUCCEEDED",
            "results": [
                {
                    "orig_prompt": "Healing-style hand-drawn poster featuring three puppies playing with a ball on lush green grass, adorned with decorative elements such as birds and stars. The main title “Come Play Ball!” is prominently displayed at the top in bold, blue cartoon font. Below it, the subtitle “Come [Show Off Your Skills]!” appears in green font. A speech bubble adds playful charm with the text: “Hehe, watch me amaze my little friends next!” At the bottom, supplementary text reads: “We get to play ball with our friends again!” The color palette centers on fresh greens and blues, accented with bright pink and yellow tones to highlight a cheerful, childlike atmosphere.",
                    "actual_prompt": "Childhood-inspired hand-drawn poster design: Three playful puppies joyfully interact with a colorful ball on a vibrant patch of lush green grass. Delicate decorative elements including fluttering birds and twinkling stars are scattered throughout. At the top center, the bold, blue cartoon-style title “Come Play Ball!” stands out prominently. Directly beneath, the subtitle “Come [Show Off Your Skills]!” is rendered in cheerful green lettering. A whimsical speech bubble near one of the puppies contains the playful text: “Hehe, watch me amaze my little friends next!” At the bottom edge, smaller supplementary text reads: “We get to play ball with our friends again!” The color palette is centered on fresh greens and sky blues, accented with pops of bright pink and sunny yellow, enhancing the cheerful, childlike atmosphere. Style evokes nostalgic, hand-inked illustrations with soft textures, gentle linework, and a whimsical, storybook-like composition.",
                    "url": "https://dashscope-result-sz.oss-cn-shenzhen.aliyuncs.com/xxx.png?Expires=xxxx"
                }
            ]
        },
        "usage": {
            "image_count": 1
        }
    }
    ```
    

## Use with the OpenAI Agents SDK

Image generation models such as Qwen-Image are called through the DashScope native API and do not support OpenAI-compatible (compatible-mode) mode, so they cannot be used directly as the reasoning model of an Agent in the OpenAI Agents SDK.

In agent frameworks such as the OpenAI Agents SDK, you can wrap image generation as a tool (function tool) and let a text chat model that supports OpenAI-compatible mode (such as qwen-plus) act as the Agent's reasoning core to orchestrate it. For example:

Before running, install the dependencies: `pip install openai-agents dashscope`.

```
import os
import asyncio
import dashscope
from openai import AsyncOpenAI
from dashscope import MultiModalConversation
from agents import Agent, Runner, function_tool, OpenAIChatCompletionsModel

# Read the Model Studio API Key from an environment variable
# (or replace with api_key="sk-xxx")
API_KEY = os.getenv("DASHSCOPE_API_KEY")

# Singapore region. Replace {WorkspaceId} with your actual workspace ID. URLs vary by region.
dashscope.base_http_api_url = "https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1"
# The text chat model (the Agent's reasoning core) is accessed via OpenAI-compatible mode
client = AsyncOpenAI(api_key=API_KEY, base_url="https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1")


# Wrap image generation as a function tool for the Agent to call
@function_tool
def generate_image(prompt: str) -> str:
    """Generate an image from a text description and return its URL. prompt: the text description of the image."""
    rsp = MultiModalConversation.call(
        api_key=API_KEY,
        model="qwen-image",
        messages=[{"role": "user", "content": [{"text": prompt}]}],
        result_format="message",
    )
    if rsp.status_code != 200:
        return f"Generation failed: {rsp.code} {rsp.message}"
    return rsp.output.choices[0].message.content[0]["image"]


agent = Agent(
    name="Image Assistant",
    instructions="You are an image generation assistant. When the user wants an image, call the generate_image tool and return the image URL to the user.",
    model=OpenAIChatCompletionsModel(model="qwen-plus", openai_client=client),
    tools=[generate_image],
)


async def main():
    result = await Runner.run(agent, "Draw a corgi running on the grass")
    print(result.final_output)


if __name__ == "__main__":
    asyncio.run(main())
```

## **Billing and rate limiting**

-   For free quotas and pricing, see [Model pricing](/help/en/model-studio/model-pricing#fc5b2efa93kzk).
    
-   For rate limits, see [Qwen-Image](/help/en/model-studio/rate-limit#11371335d3feh).
    
-   Billing details: Each **successfully generated image** is billed. Failed calls or processing errors do not incur charges or consume your [new user free quota](/help/en/model-studio/new-free-quota).
    

## **Error codes**

If the model call fails and returns an error message, see [Error codes](/help/en/model-studio/error-code) for resolution.

## **FAQ**

#### **Q: Should I enable or disable the prompt\_extend parameter?**

A: Enable this option (default) if you want more diverse image content and for the model to add details. Disable it if you need tighter control over image details, and optimize your prompts using the [Text-to-Image Prompt Guide](/help/en/model-studio/text-to-image-prompt).

#### **Q: What are the differences between qwen-image, qwen-image-plus, qwen-image-max, qwen-image-2.0, and qwen-image-edit?**

A:

-   **Combined image generation and editing models:** Support both text-to-image and image editing.
    
    -   `qwen-image-2.0-pro` and `qwen-image-2.0-pro-2026-03-03`: Same capabilities. The Pro series delivers more professional text rendering, finer realistic textures, detailed realistic scenes, and stronger semantic adherence. Supports synchronous calls only.
        
    -   `qwen-image-2.0` and `qwen-image-2.0-2026-03-03`: Same capabilities. The accelerated version balances model performance and quality. Supports synchronous calls only.
        
-   **Text-to-image models:** Generate images from text descriptions.
    
    -   `qwen-image-max` and `qwen-image-max-2025-12-30`: Same capabilities. Compared with `qwen-image-plus`, they deliver improved realism and naturalness, with better results for character textures, details, and text rendering.
        
    -   `qwen-image` and `qwen-image-plus`: Same capabilities, but `qwen-image-plus` is more cost-effective.
        
    -   `qwen-image-plus-2026-01-09`: A new snapshot version of Qwen-Image. It is a distilled and accelerated version of `qwen-image-max` that supports fast generation of high-quality images.
        
-   **Image editing model:**`qwen-image-edit`: Performs image-to-image transformations, inpainting, and other operations based on an input image and text instructions. For more information, see [Qwen - image editing](/help/en/model-studio/qwen-image-edit-api).
    

### **Q: How do I get the domain name whitelist for image storage?**

A: Images generated by models are stored in OSS. The API returns a temporary public URL. **To configure a firewall whitelist for this download URL**, note the following: The underlying storage may change dynamically. This topic does not provide a fixed OSS domain name whitelist to prevent access issues caused by outdated information. If you have security control requirements, contact your account manager to obtain the latest OSS domain name list.

/\* Adjust table width \*/ .aliyun-docs-content table.medium-width { max-width: 1018px; width: 100%; } .aliyun-docs-content table.table-no-border tr td:first-child { padding-left: 0; } .aliyun-docs-content table.table-no-border tr td:last-child { padding-right: 0; } /\* Support sticky positioning \*/ div:has(.aliyun-docs-content), .aliyun-docs-content .markdown-body { overflow: visible; } .stick-top { position: sticky; top: 46px; } /\*\* Code block font \*\*/ /\* Reduce code block margin in tables to make table information more compact \*/ .unionContainer .markdown-body table .help-code-block { margin: 0 !important; } /\* Reduce code block font size in tables to make table information more compact \*/ .unionContainer .markdown-body .help-code-block pre { font-size: 12px !important; } /\* Reduce code block font size in tables to make table information more compact \*/ .unionContainer .markdown-body .help-code-block pre code { font-size: 12px !important; } /\*\* API Reference tables \*\*/ .aliyun-docs-content table.api-reference tr td:first-child { margin: 0px; border-bottom: 1px solid #d8d8d8; } .aliyun-docs-content table.api-reference tr:last-child td:first-child { border-bottom: none; } .aliyun-docs-content table.api-reference p { color: #6e6e80; } .aliyun-docs-content table.api-reference b, i { color: #181818; } .aliyun-docs-content table.api-reference .collapse { border: none; margin-top: 4px; margin-bottom: 4px; } .aliyun-docs-content table.api-reference .collapse .expandable-title-bold { padding: 0; } .aliyun-docs-content table.api-reference .collapse .expandable-title { padding: 0; } .aliyun-docs-content table.api-reference .collapse .expandable-title-bold .title { margin-left: 16px; } .aliyun-docs-content table.api-reference .collapse .expandable-title .title { margin-left: 16px; } .aliyun-docs-content table.api-reference .collapse .expandable-title-bold i.icon { position: absolute; color: #777; font-weight: 100; } .aliyun-docs-content table.api-reference .collapse .expandable-title i.icon { position: absolute; color: #777; font-weight: 100; } .aliyun-docs-content table.api-reference .collapse.expanded .expandable-content { padding: 10px 14px 10px 14px !important; margin: 0; border: 1px solid #e9e9e9; } .aliyun-docs-content table.api-reference .collapse .expandable-title-bold b { font-size: 13px; font-weight: normal; color: #6e6e80; } .aliyun-docs-content table.api-reference .collapse .expandable-title b { font-size: 13px; font-weight: normal; color: #6e6e80; } .aliyun-docs-content table.api-reference .tabbed-content-box { border: none; } .aliyun-docs-content table.api-reference .tabbed-content-box section { padding: 8px 0 !important; } .aliyun-docs-content table.api-reference .tabbed-content-box.mini .tab-box { /\* position: absolute; left: 40px; right: 0; \*/ } .aliyun-docs-content .margin-top-33 { margin-top: 33px !important; } .aliyun-docs-content .two-codeblocks pre { max-height: calc(50vh - 136px) !important; height: auto; } .expandable-content section { border-bottom: 1px solid #e9e9e9; padding-top: 6px; padding-bottom: 4px; } .expandable-content section:last-child { border-bottom: none; } .expandable-content section:first-child { padding-top: 0; }

/\* Reduce vertical spacing for blockquotes to avoid sparse content \*/ .unionContainer .markdown-body blockquote { margin: 4px 0; } .aliyun-docs-content table.qwen blockquote { border-left: none; /\* Remove left border for blockquotes in tables \*/ padding-left: 5px; /\* Add left padding \*/ margin: 4px 0; } /\* Style tables as column cards similar to DingTalk docs \*/ table.help-table-card td { border: 10px solid #FFF !important; background: #F4F6F9; padding: 16px !important; vertical-align: top; } /\* Reduce margin for code blocks in tables for a more compact layout \*/ .unionContainer .markdown-body table .help-code-block { margin: 0 !important; } /\* Reduce font size for code blocks in tables for a more compact layout \*/ .unionContainer .markdown-body .help-code-block pre { font-size: 12px !important; } /\* Reduce font size for code blocks in tables for a more compact layout \*/ .unionContainer .markdown-body .help-code-block pre code { font-size: 12px !important; } /\* Reduce vertical spacing for blockquotes in tables to avoid sparse content \*/ .unionContainer .markdown-body table blockquote { margin: 4px 0 0 0; } /\* Sets table images as block elements (which occupy a full line), centers them, and allows them to be clicked to view the original image. \*/ .unionContainer .markdown-body .image.break { margin: 0px; display: inline-block; vertical-align: middle }

Qwen-Image Edit supports multi-image input and output. Edit text within images, add, remove, or move objects, change subject poses, transfer styles, and enhance details — all through natural language prompts.

## **Model overview**

| **Input image 1** | **Input image 2** | **Input image 3** | **Output images (multiple)** |   |
| --- | --- | --- | --- | --- |
| ![image99](https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/5844029571/p1011682.webp) | ![image98](https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/6844029571/p1011684.webp) | ![image89](https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/5844029571/p1011683.webp) | ![image100](https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/6844029571/p1011681.webp) | ![imageout2](https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/6903291671/p1022524.webp) |

> Prompt: The girl from Image 1 is wearing the black dress from Image 2 and sitting in the pose from Image 3.

| **Model name** | **Model description** | **Output image specifications** |
| --- | --- | --- |
| qwen-image-2.0-pro `**Recommended**` > It currently has the same capabilities as qwen-image-2.0-pro-2026-04-22 | The Pro series of Qwen image generation and editing models offers enhanced capabilities in text rendering, realistic textures, and semantic adherence. > For image generation, see [Qwen-Text to Image](/help/en/model-studio/qwen-image-api). | Image resolution: - **Customizable**: The total number of pixels must be between 512\\*512 and 2048\\*2048. - **Default**: The total number of pixels is close to 1024\\*1024, with an aspect ratio similar to the input image (or the last image in a multi-image input). Image format: png Number of images: 1–6 |
| qwen-image-2.0-pro-2026-06-22 `**Recommended**` |
| qwen-image-2.0-pro-2026-04-22 |
| qwen-image-2.0-pro-2026-03-03 |
| qwen-image-2.0 `**Recommended**` > It currently has the same capabilities as qwen-image-2.0-2026-03-03 | This is the accelerated version of the Qwen image generation and editing model, balancing performance and response speed. > For image generation, see [Qwen-Text to Image](/help/en/model-studio/qwen-image-api). |
| qwen-image-2.0-2026-03-03 `**Recommended**` |
| qwen-image-edit-max > It currently has the same capabilities as qwen-image-edit-max-2026-01-16 | The Max series of Qwen image editing models provides stronger capabilities in industrial design, geometric reasoning, and character consistency. | Image resolution: - **Customizable**: The width and height can each range from `[512, 2048]` pixels. - **Default**: The total number of pixels is close to 1024\\*1024, with an aspect ratio similar to the input image (or the last image in a multi-image input). Image format: png Number of images: 1–6 |
| qwen-image-edit-max-2026-01-16 |
| qwen-image-edit-plus > It currently has the same capabilities as qwen-image-edit-plus-2025-10-30 | The Plus series of Qwen image editing models supports multiple image outputs and custom resolutions. |
| qwen-image-edit-plus-2025-12-15 |
| qwen-image-edit-plus-2025-10-30 |
| qwen-image-edit | This model supports single-image editing and multi-image fusion. | Image resolution: **Not customizable**. The generation rule is the same as the **Default** rule described above. Image format: png Number of images: Fixed at 1 |

**Note**

Before calling the API, check the [Model List](/help/en/model-studio/models#809eb92b1fyko) to see which models are supported in each region.

## **Prerequisites**

Before making a call, [get an API key](/help/en/model-studio/get-api-key) and [export the API key as an environment variable](/help/en/model-studio/configure-api-key-through-environment-variables).

To call the API using the SDK, [install the DashScope SDK](/help/en/model-studio/install-sdk). The SDK is available for Python and Java.

**Important**

The China (Beijing) and Singapore regions have separate **API keys** and **request endpoints**. They cannot be used interchangeably. Cross-region calls lead to authentication failures or service errors.

## HTTP call

**Singapore region:**`POST https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation`

**Beijing region:**`POST https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation`

When calling, replace `{WorkspaceId}` with your actual [workspace ID](/help/en/model-studio/obtain-the-app-id-and-workspace-id#d3eb3cd37b7fu).

| #### Request parameters | ## Single-image editing This example uses the `qwen-image-2.0-pro` model to output two images. ``` curl --location 'https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation' \\ --header 'Content-Type: application/json' \\ --header "Authorization: Bearer $DASHSCOPE_API_KEY" \\ --data '{ "model": "qwen-image-2.0-pro", "input": { "messages": [ { "role": "user", "content": [ { "image": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20250925/fpakfo/image36.webp" }, { "text": "Generate an image that matches the depth map, following this description: A red, dilapidated bicycle is parked on a muddy path, with a dense primeval forest in the background." } ] } ] }, "parameters": { "n": 2, "negative_prompt": " ", "prompt_extend": true, "watermark": false, "size": "1536*1024" } }' ``` ## Multi-image fusion This example uses the `qwen-image-2.0-pro` model to output two images. ``` curl --location 'https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation' \\ --header 'Content-Type: application/json' \\ --header "Authorization: Bearer $DASHSCOPE_API_KEY" \\ --data '{ "model": "qwen-image-2.0-pro", "input": { "messages": [ { "role": "user", "content": [ { "image": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20250925/thtclx/input1.png" }, { "image": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20250925/iclsnx/input2.png" }, { "image": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20250925/gborgw/input3.png" }, { "text": "The girl from Image 1 is wearing the black dress from Image 2 and sitting in the pose from Image 3." } ] } ] }, "parameters": { "n": 2, "negative_prompt": " ", "prompt_extend": true, "watermark": false, "size": "1024*1536" } }' ``` |
| --- | --- |
| ##### Request headers |
| **Content-Type** `*string*` **(Required)** The content type of the request. Must be `application/json`. |
| **Authorization** `*string*` **(Required)** Authenticates the request with a Model Studio API key. Example: Bearer sk-xxxx. |
| ##### Request body |
| **model** `*string*` **(Required)** The model name. Example: qwen-image-2.0-pro. |
| **input** `*object*` **(Required)** The input object, containing the following field: **Property** **messages** `*array*` **(Required)** The request content array. **Only single-turn conversations are currently supported**, so the array must contain **exactly one object** with the `role` and `content` properties. **Property** **role** `*string*` **(Required)** The message sender role. Must be `user`. **content** `*array*` **(Required)** The message content, consisting of one to three images in the format `{"image": "..."}` and a single editing instruction in the format `{"text": "..."}`. **Property** **image** `*string*` **(Required)** The URL or Base64-encoded data of the input image. You can provide one to three images. For multi-image input, the image order is defined by the array sequence. The aspect ratio of the output image is based on the last image. **Image requirements:** - Image format: JPG, JPEG, PNG, BMP, TIFF, WEBP, or GIF. > The output image is in PNG format. For animated GIFs, only the first frame is processed. - Image resolution: For best results, the image width and height should both be between 384 and 3072 pixels. Low resolution may result in blurry output, while high resolution increases processing time. - Image size: No more than 10 MB. **Supported input formats** 1. Public URL: - Supports HTTP and HTTPS protocols. - For example: `https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20250925/fpakfo/image36.webp`. 2. Base64-encoded image string - For example: `data:image/jpeg;base64,GDU7MtCZz...` (This example is truncated for demonstration purposes.) - For Base64 encoding specifications, see [Pass an image using Base64 encoding](#a96bcc9c8byv5). **text** `*string*` **(Required)** A positive prompt describing the desired content, style, and composition of the output image. Supports Chinese and English. The `qwen-image-2.0` series accept up to 1,300 tokens. Other models accept up to 800 tokens. The system truncates excess tokens. **Note**: The `content` array must contain exactly one `text` object. Otherwise, an error will occur. |
| **parameters** `*object*` (Optional) Additional parameters to control image generation. **Property** **n** `*integer*` (Optional) The number of output images. Default: 1. For the qwen-image-2.0, qwen-image-edit-max, or qwen-image-edit-plus series models, you can choose to output one to six images. For `qwen-image-edit`, only one image can be output. **negative\\_prompt** `*string*` (Optional) A negative prompt describing content to exclude from the output. Use it to constrain the generation. Supports Chinese and English. Maximum 500 characters. Each Chinese character, letter, number, or symbol counts as one character. Excess characters are automatically truncated. For example: low resolution, error, worst quality, low quality, disfigured, extra fingers, or bad proportions. **size** `*string*` (Optional) The output image resolution in the format `width*height`. Example: `"1024*1536"`. **qwen-image-2.0 series models**: - The total number of pixels must be between 512\\*512 and 2048\\*2048. - By default, the total number of pixels is close to `1024*1024`, with an aspect ratio similar to the input image (or the last image in a multi-image input). **qwen-image-edit-max or qwen-image-edit-plus series models**: - The width and height can each range from \\[512, 2048\\] pixels. - By default, the total number of pixels is close to `1024*1024`, with an aspect ratio similar to the input image (or the last image in a multi-image input). > If you specify the `size` parameter, the system uses the width and height specified by `size` as the target and adjusts the dimensions of the actual output image to the nearest multiples of 16. For example, if you specify `1033*1032`, the output image size is `1040*1024`. Recommended resolutions for common aspect ratios - 1:1: 1024\\*1024, or 1536\\*1536 - 2:3: 768\\*1152, or 1024\\*1536 - 3:2: 1152\\*768, or 1536\\*1024 - 3:4: 960\\*1280, or 1080\\*1440 - 4:3: 1280\\*960, or 1440\\*1080 - 9:16: 720\\*1280, or 1080\\*1920 - 16:9: 1280\\*720, or 1920\\*1080 - 21:9: 1344\\*576, or 2048\\*872 **Supported models**: All models except `qwen-image-edit`. **prompt\\_extend** `*bool*` (Optional) Enables intelligent prompt rewriting. Default: `true`. When enabled, the model optimizes the positive prompt (`text`), significantly improving results for simple prompts. **Supported models**: All models except `qwen-image-edit`. **watermark** `*bool*` (Optional) Adds a "Qwen-Image" watermark to the bottom-right corner. Default: `false`. **seed** `*integer*` (Optional) The random number seed. Valid range: `[0, 2147483647]`. Setting the same `seed` value helps maintain relative stability in generated output. If omitted, the algorithm uses a random seed. **Note**: Image generation is probabilistic. Even with the same `seed`, results may vary between calls. |

| #### Response parameters | ## Task successful Task data (task status and image URLs) is retained for only 24 hours and then automatically purged. Save generated images promptly. ``` { "output": { "choices": [ { "finish_reason": "stop", "message": { "role": "assistant", "content": [ { "image": "https://dashscope-result-sz.oss-cn-shenzhen.aliyuncs.com/xxx.png?Expires=xxx" }, { "image": "https://dashscope-result-sz.oss-cn-shenzhen.aliyuncs.com/xxx.png?Expires=xxx" } ] } } ] }, "usage": { "width": 1536, "image_count": 2, "height": 1024 }, "request_id": "bf37ca26-0abe-98e4-8065-xxxxxx" } ``` ## Task error If the task fails for any reason, relevant information is returned. You can identify the cause of the error using the code and message fields. For more information, see [Error codes](/help/en/model-studio/error-code). ``` { "request_id": "31f808fd-8eef-9004-xxxxx", "code": "InvalidApiKey", "message": "Invalid API-key provided." } ``` |
| --- | --- |
| **output** `*object*` The model's generation results. **Property** **choices** `*array*` A list of result choices. **Property** **finish\\_reason** `*string*` The reason the task stopped. Returns `stop` for a natural stop. **message** `*object*` The message returned by the model. **Property** **role** `*string*` The message role. Fixed at `assistant`. **content** `*array*` The message content, which contains the generated image information. **Property** **image** `*string*` URL of the generated image in PNG format. **Valid for 24 hours**. Download and save the image promptly. |
| **usage** `*object*` Resource usage for this call. Returned only on success. **Property** **image\\_count** `*integer*` The number of generated images. **width** `*integer*` The width of the generated image in pixels. **height** `*integer*` The height of the generated image in pixels. |
| **request\\_id** `*string*` Unique request identifier for tracing and troubleshooting. |
| **code** `*string*` Error code. Returned only for failed requests. See [Error codes](/help/en/model-studio/error-code). |
| **message** `*string*` Detailed error message. Returned only for failed requests. See [Error codes](/help/en/model-studio/error-code). |

## DashScope SDK call

SDK parameter names are mostly consistent with the [HTTP API](#42703589880ts). The parameter structure is encapsulated based on the language features. For a complete list of parameters, see [Qwen API reference](/help/en/model-studio/qwen-api-reference/).

### Python SDK call

**Note**

-   We recommend installing the latest version of the DashScope Python SDK to avoid potential runtime errors. For more information, see [Install or upgrade the SDK](/help/en/model-studio/install-sdk).
    
-   Asynchronous interfaces are not supported.
    

#### **Request examples**

## **Pass an image using a public URL**

```
import json
import os
import dashscope
from dashscope import MultiModalConversation

# The following is the URL for the Singapore region. Replace {WorkspaceId} with your Bailian workspace ID. URLs vary by region.
dashscope.base_http_api_url = 'https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1'

# The model supports one to three input images.
messages = [
    {
        "role": "user",
        "content": [
            {"image": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20250925/thtclx/input1.png"},
            {"image": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20250925/iclsnx/input2.png"},
            {"image": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20250925/gborgw/input3.png"},
            {"text": "The girl from Image 1 is wearing the black dress from Image 2 and sitting in the pose from Image 3."}
        ]
    }
]

# The API keys for the Singapore and Beijing regions are different. To get an API key, see https://www.alibabacloud.com/help/en/model-studio/get-api-key.
# If you have not configured the environment variable, replace the next line with: api_key="sk-xxx"
api_key = os.getenv("DASHSCOPE_API_KEY")

# The qwen-image-2.0, qwen-image-edit-max, and qwen-image-edit-plus series support one to six output images. This example generates two.
response = MultiModalConversation.call(
    api_key=api_key,
    model="qwen-image-2.0-pro",
    messages=messages,
    stream=False,
    n=2,
    watermark=False,
    negative_prompt=" ",
    prompt_extend=True,
    size="1024*1536",
)

if response.status_code == 200:
    # To view the full response, uncomment the next line.
    # print(json.dumps(response, ensure_ascii=False))
    for i, content in enumerate(response.output.choices[0].message.content):
        print(f"URL of output image {i+1}: {content['image']}")
else:
    print(f"HTTP status code: {response.status_code}")
    print(f"Error code: {response.code}")
    print(f"Error message: {response.message}")
    print("For more information, see https://www.alibabacloud.com/help/en/model-studio/error-code")
```

## **Pass an image using Base64 encoding**

```
import json
import os
import dashscope
from dashscope import MultiModalConversation
import base64
import mimetypes

# The following is the URL for the Singapore region. Replace {WorkspaceId} with your Bailian workspace ID. URLs vary by region.
dashscope.base_http_api_url = 'https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1'

# --- For Base64 encoding ---
# Format: data:{mime_type};base64,{base64_data}
def encode_file(file_path):
    mime_type, _ = mimetypes.guess_type(file_path)
    if not mime_type or not mime_type.startswith("image/"):
        raise ValueError("Unsupported or unrecognized image format")

    try:
        with open(file_path, "rb") as image_file:
            encoded_string = base64.b64encode(
                image_file.read()).decode('utf-8')
        return f"data:{mime_type};base64,{encoded_string}"
    except IOError as e:
        raise IOError(f"Error reading file: {file_path}, Error: {str(e)}")

# Get the Base64 encoding of the image.
# Call the encoding function. Replace "/path/to/your/image.png" with the path to your local image file. Otherwise, the code will not run.
image = encode_file("/path/to/your/image.png")

messages = [
    {
        "role": "user",
        "content": [
            {"image": image},
            {"text": "Generate an image that matches the depth map, following this description: A red, dilapidated bicycle is parked on a muddy path, with a dense primeval forest in the background."}
        ]
    }
]

# The API keys for the Singapore and Beijing regions are different. To get an API key, see https://www.alibabacloud.com/help/en/model-studio/get-api-key.
# If you have not configured the environment variable, replace the next line with: api_key="sk-xxx"
api_key = os.getenv("DASHSCOPE_API_KEY")

# The qwen-image-2.0, qwen-image-edit-max, and qwen-image-edit-plus series support one to six output images. This example generates two.
response = MultiModalConversation.call(
    api_key=api_key,
    model="qwen-image-2.0-pro",
    messages=messages,
    stream=False,
    n=2,
    watermark=False,
    negative_prompt=" ",
    prompt_extend=True,
    size="1536*1024",
)

if response.status_code == 200:
    # To view the full response, uncomment the next line.
    # print(json.dumps(response, ensure_ascii=False))
    for i, content in enumerate(response.output.choices[0].message.content):
        print(f"URL of output image {i+1}: {content['image']}")
else:
    print(f"HTTP status code: {response.status_code}")
    print(f"Error code: {response.code}")
    print(f"Error message: {response.message}")
    print("For more information, see https://www.alibabacloud.com/help/en/model-studio/error-code")
```

## **Download an image from a URL**

```
# You need to install requests to download the image: pip install requests
import requests

def download_image(image_url, save_path='output.png'):
    try:
        response = requests.get(image_url, stream=True, timeout=300)  # Set a timeout.
        response.raise_for_status()  # Raise an exception if the HTTP status code is not 200.
        with open(save_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        print(f"Image successfully downloaded to: {save_path}")

    except requests.exceptions.RequestException as e:
        print(f"Image download failed: {e}")

image_url = "https://dashscope-result-sz.oss-cn-shenzhen.aliyuncs.com/xxx.png?Expires=xxx"
download_image(image_url, save_path='output.png')
```

#### **Response example**

The image URL is valid for 24 hours. Download the image promptly.

> `input_tokens` , `output_tokens` , and `characters` fields are compatible. Their values are currently fixed at 0.

```
{
    "status_code": 200,
    "request_id": "fa41f9f9-3cb6-434d-a95d-4ae6b9xxxxxx",
    "code": "",
    "message": "",
    "output": {
        "text": null,
        "finish_reason": null,
        "choices": [
            {
                "finish_reason": "stop",
                "message": {
                    "role": "assistant",
                    "content": [
                        {
                            "image": "https://dashscope-result-hz.oss-cn-hangzhou.aliyuncs.com/xxx.png?Expires=xxx"
                        },
                        {
                            "image": "https://dashscope-result-hz.oss-cn-hangzhou.aliyuncs.com/xxx.png?Expires=xxx"
                        }
                    ]
                }
            }
        ],
        "audio": null
    },
    "usage": {
        "input_tokens": 0,
        "output_tokens": 0,
        "characters": 0,
        "height": 1536,
        "image_count": 2,
        "width": 1024
    }
}
```

### Call using the Java SDK

**Note**

Install the latest DashScope Java SDK to avoid runtime errors. See [Install or upgrade the SDK](/help/en/model-studio/install-sdk).

#### **Request examples**

## **Pass an image using a public URL**

```
import com.alibaba.dashscope.aigc.multimodalconversation.MultiModalConversation;
import com.alibaba.dashscope.aigc.multimodalconversation.MultiModalConversationParam;
import com.alibaba.dashscope.aigc.multimodalconversation.MultiModalConversationResult;
import com.alibaba.dashscope.common.MultiModalMessage;
import com.alibaba.dashscope.common.Role;
import com.alibaba.dashscope.exception.ApiException;
import com.alibaba.dashscope.exception.NoApiKeyException;
import com.alibaba.dashscope.exception.UploadFileException;
import com.alibaba.dashscope.utils.JsonUtils;
import com.alibaba.dashscope.utils.Constants;

import java.io.IOException;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.List;

public class QwenImageEdit {

    static {
        // The following is the URL for the Singapore region. Replace {WorkspaceId} with your Bailian workspace ID. URLs vary by region.
        Constants.baseHttpApiUrl = "https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1";
    }
    
    // The API keys for the Singapore and Beijing regions are different. To obtain an API key, see https://www.alibabacloud.com/help/en/model-studio/get-api-key.
    // If you have not configured the environment variable, replace the following line with your DashScope API key: apiKey="sk-xxx".
    static String apiKey = System.getenv("DASHSCOPE_API_KEY");

    public static void call() throws ApiException, NoApiKeyException, UploadFileException, IOException {

        MultiModalConversation conv = new MultiModalConversation();

        // The model supports one to three input images.
        MultiModalMessage userMessage = MultiModalMessage.builder().role(Role.USER.getValue())
                .content(Arrays.asList(
                        Collections.singletonMap("image", "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20250925/thtclx/input1.png"),
                        Collections.singletonMap("image", "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20250925/iclsnx/input2.png"),
                        Collections.singletonMap("image", "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20250925/gborgw/input3.png"),
                        Collections.singletonMap("text", "The girl from Image 1 is wearing the black dress from Image 2 and sitting in the pose from Image 3.")
                )).build();
        // The qwen-image-2.0, qwen-image-edit-max, and qwen-image-edit-plus series models support one to six output images. This example generates two images.
        Map<String, Object> parameters = new HashMap<>();
        parameters.put("watermark", false);
        parameters.put("negative_prompt", " ");
        parameters.put("n", 2);
        parameters.put("prompt_extend", true);
        parameters.put("size", "1024*1536");

        MultiModalConversationParam param = MultiModalConversationParam.builder()
                .apiKey(apiKey)
                .model("qwen-image-edit-max")
                .messages(Collections.singletonList(userMessage))
                .parameters(parameters)
                .build();

        MultiModalConversationResult result = conv.call(param);
        // To view the complete response, uncomment the following line.
        // System.out.println(JsonUtils.toJson(result));
        List<Map<String, Object>> contentList = result.getOutput().getChoices().get(0).getMessage().getContent();
        int imageIndex = 1;
        for (Map<String, Object> content : contentList) {
            if (content.containsKey("image")) {
                System.out.println("URL of output image " + imageIndex + ": " + content.get("image"));
                imageIndex++;
            }
        }
    }

    public static void main(String[] args) {
        try {
            call();
        } catch (ApiException | NoApiKeyException | UploadFileException | IOException e) {
            System.out.println(e.getMessage());
        }
    }
}
```

## **Pass an image using Base64 encoding**

```
import com.alibaba.dashscope.aigc.multimodalconversation.MultiModalConversation;
import com.alibaba.dashscope.aigc.multimodalconversation.MultiModalConversationParam;
import com.alibaba.dashscope.aigc.multimodalconversation.MultiModalConversationResult;
import com.alibaba.dashscope.common.MultiModalMessage;
import com.alibaba.dashscope.common.Role;
import com.alibaba.dashscope.exception.ApiException;
import com.alibaba.dashscope.exception.NoApiKeyException;
import com.alibaba.dashscope.exception.UploadFileException;
import com.alibaba.dashscope.utils.JsonUtils;
import com.alibaba.dashscope.utils.Constants;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Arrays;
import java.util.Base64;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.List;

public class QwenImageEdit {

    static {
        // The following is the URL for the Singapore region. Replace {WorkspaceId} with your Bailian workspace ID. URLs vary by region.
        Constants.baseHttpApiUrl = "https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1";
    }
    
    // The API keys for the Singapore and Beijing regions are different. To obtain an API key, see https://www.alibabacloud.com/help/en/model-studio/get-api-key.
    // If you have not configured the environment variable, replace the following line with your DashScope API key: apiKey="sk-xxx".
    static String apiKey = System.getenv("DASHSCOPE_API_KEY");

    public static void call() throws ApiException, NoApiKeyException, UploadFileException, IOException {

        // Replace "/path/to/your/image.png" with the path to your local image file. Otherwise, the code cannot run.
        String image = encodeFile("/path/to/your/image.png");

        MultiModalConversation conv = new MultiModalConversation();

        MultiModalMessage userMessage = MultiModalMessage.builder().role(Role.USER.getValue())
                .content(Arrays.asList(
                        Collections.singletonMap("image", image),
                        Collections.singletonMap("text", "Generate an image that matches the depth map, following this description: A dilapidated red bicycle is parked on a muddy path, with a dense primeval forest in the background.")
                )).build();
        // The qwen-image-2.0, qwen-image-edit-max, and qwen-image-edit-plus series models support one to six output images. This example generates two images.
        Map<String, Object> parameters = new HashMap<>();
        parameters.put("watermark", false);
        parameters.put("negative_prompt", " ");
        parameters.put("n", 2);
        parameters.put("prompt_extend", true);
        parameters.put("size", "1536*1024");

        MultiModalConversationParam param = MultiModalConversationParam.builder()
                .apiKey(apiKey)
                .model("qwen-image-edit-max")
                .messages(Collections.singletonList(userMessage))
                .parameters(parameters)
                .build();

        MultiModalConversationResult result = conv.call(param);
        // To view the complete response, uncomment the following line.
        // System.out.println(JsonUtils.toJson(result));
        List<Map<String, Object>> contentList = result.getOutput().getChoices().get(0).getMessage().getContent();
        int imageIndex = 1;
        for (Map<String, Object> content : contentList) {
            if (content.containsKey("image")) {
                System.out.println("URL of output image " + imageIndex + ": " + content.get("image"));
                imageIndex++;
            }
        }
    }

    /**
     * Encodes a file into a Base64 string.
     * @param filePath The path to the file.
     * @return A Base64 string in the format: data:{mime_type};base64,{base64_data}.
     */
    public static String encodeFile(String filePath) {
        Path path = Paths.get(filePath);
        if (!Files.exists(path)) {
            throw new IllegalArgumentException("File does not exist: " + filePath);
        }
        // Detect the MIME type.
        String mimeType = null;
        try {
            mimeType = Files.probeContentType(path);
        } catch (IOException e) {
            throw new IllegalArgumentException("Cannot detect file type: " + filePath);
        }
        if (mimeType == null || !mimeType.startsWith("image/")) {
            throw new IllegalArgumentException("Unsupported or unrecognized image format.");
        }
        // Read the file content and encode it.
        byte[] fileBytes = null;
        try{
            fileBytes = Files.readAllBytes(path);
        } catch (IOException e) {
            throw new IllegalArgumentException("Cannot read file content: " + filePath);
        }

        String encodedString = Base64.getEncoder().encodeToString(fileBytes);
        return "data:" + mimeType + ";base64," + encodedString;
    }

    public static void main(String[] args) {
        try {
            call();
        } catch (ApiException | NoApiKeyException | UploadFileException | IOException e) {
            System.out.println(e.getMessage());
        }
    }
}
```

## **Download an image from a URL**

```
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
 
public class ImageDownloader {
    public static void downloadImage(String imageUrl, String savePath) {
        try {
            URL url = new URL(imageUrl);
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            connection.setConnectTimeout(5000);
            connection.setReadTimeout(300000);
            connection.setRequestMethod("GET");
            InputStream inputStream = connection.getInputStream();
            FileOutputStream outputStream = new FileOutputStream(savePath);
            byte[] buffer = new byte[8192];
            int bytesRead;
            while ((bytesRead = inputStream.read(buffer)) != -1) {
                outputStream.write(buffer, 0, bytesRead);
            }
            inputStream.close();
            outputStream.close();
 
            System.out.println("Image downloaded successfully to: " + savePath);
        } catch (Exception e) {
            System.err.println("Image download failed: " + e.getMessage());
        }
    }
 
    public static void main(String[] args) {
        String imageUrl = "http://dashscope-result-bj.oss-cn-beijing.aliyuncs.com/xxx?Expires=xxx";
        String savePath = "output.png";
        downloadImage(imageUrl, savePath);
    }
}
```

#### **Response examples**

The image URL is valid for 24 hours. Download the image promptly.

```
{
    "requestId": "46281da9-9e02-941c-ac78-be88b8xxxxxx",
    "usage": {
        "image_count": 2,
        "width": 1024,
        "height": 1536
    },
    "output": {
        "choices": [
            {
                "finish_reason": "stop",
                "message": {
                    "role": "assistant",
                    "content": [
                        {
                            "image": "https://dashscope-result-sz.oss-cn-shenzhen.aliyuncs.com/xxx.png?Expires=xxx"
                        },
                        {
                            "image": "https://dashscope-result-sz.oss-cn-shenzhen.aliyuncs.com/xxx.png?Expires=xxx"
                        }
                    ]
                }
            }
        ]
    }
}
```

## **Error codes**

If the model call fails and returns an error message, see [Error codes](/help/en/model-studio/error-code) for resolution.

## **Billing and rate limiting**

-   For model free quotas and billing rates, see the [Model List](/help/en/model-studio/models#809eb92b1fyko).
    
-   Refer to [Qwen-Image](/help/en/model-studio/rate-limit#11371335d3feh) for model rate limiting details.
    
-   Billing: You are billed per successfully generated **image**. Failed calls incur no charges and do not consume your [new-user free quota](/help/en/model-studio/new-free-quota).
    

## **FAQ**

#### **Q: What languages does the Qwen Image Editing model support?**

A: The model currently supports **Simplified Chinese and English**. You can try other languages, but performance is not guaranteed.

##### **Q: How do I view model invocation metrics?**

A: One hour after a model invocation completes, go to the [**Monitoring** (Singapore)](https://modelstudio.console.alibabacloud.com/?tab=dashboard#/model-telemetry) or [**Monitoring** (China (Beijing))](https://bailian.console.alibabacloud.com/?tab=model#/model-telemetry) page to view metrics such as invocation count and success rate. For more information, see [Billing and cost management](/help/en/model-studio/bill-query-and-cost-management).

##### **Q: How do I get the domain name whitelist for image storage?**

A: Images generated by models are stored in OSS. The API returns a temporary public URL. **To configure a firewall whitelist for this download URL**, note the following: The underlying storage may change dynamically. This topic does not provide a fixed OSS domain name whitelist to prevent access issues caused by outdated information. If you have security control requirements, contact your account manager to obtain the latest OSS domain name list.

/\* Reduces the top and bottom margins of blockquotes to make the content appear more compact. \*/ .unionContainer .markdown-body blockquote { margin: 4px 0; } .aliyun-docs-content table.qwen blockquote { border-left: none; /\* Removes the left border of blockquotes within tables. \*/ padding-left: 5px; /\* Adds left padding. \*/ margin: 4px 0; } .gray-text { color: gray !important; font-size: 0.75em !important; /\* Reduces the font size. \*/ }

/\* Adjust table width \*/ .aliyun-docs-content table.medium-width { max-width: 1018px; width: 100%; } .aliyun-docs-content table.table-no-border tr td:first-child { padding-left: 0; } .aliyun-docs-content table.table-no-border tr td:last-child { padding-right: 0; } /\* Support sticky positioning \*/ div:has(.aliyun-docs-content), .aliyun-docs-content .markdown-body { overflow: visible; } .stick-top { position: sticky; top: 46px; } /\*\* Code block font \*\*/ /\* Reduce code block margin in tables to make table information more compact \*/ .unionContainer .markdown-body table .help-code-block { margin: 0 !important; } /\* Reduce code block font size in tables to make table information more compact \*/ .unionContainer .markdown-body .help-code-block pre { font-size: 12px !important; } /\* Reduce code block font size in tables to make table information more compact \*/ .unionContainer .markdown-body .help-code-block pre code { font-size: 12px !important; } /\*\* API Reference tables \*\*/ .aliyun-docs-content table.api-reference tr td:first-child { margin: 0px; border-bottom: 1px solid #d8d8d8; } .aliyun-docs-content table.api-reference tr:last-child td:first-child { border-bottom: none; } .aliyun-docs-content table.api-reference p { color: #6e6e80; } .aliyun-docs-content table.api-reference b, i { color: #181818; } .aliyun-docs-content table.api-reference .collapse { border: none; margin-top: 4px; margin-bottom: 4px; } .aliyun-docs-content table.api-reference .collapse .expandable-title-bold { padding: 0; } .aliyun-docs-content table.api-reference .collapse .expandable-title { padding: 0; } .aliyun-docs-content table.api-reference .collapse .expandable-title-bold .title { margin-left: 16px; } .aliyun-docs-content table.api-reference .collapse .expandable-title .title { margin-left: 16px; } .aliyun-docs-content table.api-reference .collapse .expandable-title-bold i.icon { position: absolute; color: #777; font-weight: 100; } .aliyun-docs-content table.api-reference .collapse .expandable-title i.icon { position: absolute; color: #777; font-weight: 100; } .aliyun-docs-content table.api-reference .collapse.expanded .expandable-content { padding: 10px 14px 10px 14px !important; margin: 0; border: 1px solid #e9e9e9; } .aliyun-docs-content table.api-reference .collapse .expandable-title-bold b { font-size: 13px; font-weight: normal; color: #6e6e80; } .aliyun-docs-content table.api-reference .collapse .expandable-title b { font-size: 13px; font-weight: normal; color: #6e6e80; } .aliyun-docs-content table.api-reference .tabbed-content-box { border: none; } .aliyun-docs-content table.api-reference .tabbed-content-box section { padding: 8px 0 !important; } .aliyun-docs-content table.api-reference .tabbed-content-box.mini .tab-box { /\* position: absolute; left: 40px; right: 0; \*/ } .aliyun-docs-content .margin-top-33 { margin-top: 33px !important; } .aliyun-docs-content .two-codeblocks pre { max-height: calc(50vh - 136px) !important; height: auto; } .expandable-content section { border-bottom: 1px solid #e9e9e9; padding-top: 6px; padding-bottom: 4px; } .expandable-content section:last-child { border-bottom: none; } .expandable-content section:first-child { padding-top: 0; }

The Wan text-to-image model generates images from text prompts, supporting artistic styles and realistic photographic effects.

**Quick links:** Try online ([Singapore](https://modelstudio.console.alibabacloud.com/?tab=dashboard#/efm/model_experience_center/vision?currentTab=imageGenerate) | [Virginia](https://modelstudio.console.alibabacloud.com/us-east-1?tab=dashboard#/efm/model_experience_center/vision?currentTab=imageGenerate&modelId=wan2.6-t2i) | [Beijing](https://bailian.console.alibabacloud.com/?tab=model#/efm/model_experience_center/vision?currentTab=imageGenerate)) | [Wan official website](https://create.wan.video/generate/image/text-to-image)

**Note**

Wan website features may differ from API capabilities. This document covers the API and is updated as changes occur.

## Prerequisites

Before making a call, [get an API key](/help/en/model-studio/get-api-key) and [export the API key as an environment variable](/help/en/model-studio/configure-api-key-through-environment-variables). To make calls using the SDK, [install the DashScope SDK](/help/en/model-studio/install-sdk).

**Important**

The Singapore, US (Virginia), and China (Beijing) regions have separate **API keys** and **request endpoints**. They cannot be used interchangeably. Cross-region calls lead to authentication failures or service errors. For more information, see [Select a region and service deployment scope](/help/en/model-studio/regions/).

## **HTTP synchronous (wan2.6)**

**Important**

The API in this section uses the **new protocol** and supports only the **wan2.6** model.

Retrieve the result in a single request. Recommended for most use cases.

### Singapore

`POST https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation`

When calling, replace `{WorkspaceId}` with your actual [workspace ID](/help/en/model-studio/obtain-the-app-id-and-workspace-id#d3eb3cd37b7fu).

### US (Virginia)

`POST https://dashscope-us.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation`

### China (Beijing)

`POST https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation`

When calling, replace `{WorkspaceId}` with your actual [workspace ID](/help/en/model-studio/obtain-the-app-id-and-workspace-id#d3eb3cd37b7fu).

> The global deployment scope (Frankfurt region) supports only [asynchronous calls](#9c68ccc525nta) .

| #### Request parameters | ## **Text-to-image** ``` curl --location 'https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation' \\ --header 'Content-Type: application/json' \\ --header "Authorization: Bearer $DASHSCOPE_API_KEY" \\ --data '{ "model": "wan2.6-t2i", "input": { "messages": [ { "role": "user", "content": [ { "text": "A flower shop with exquisite windows, a beautiful wooden door, and flowers on display" } ] } ] }, "parameters": { "prompt_extend": true, "watermark": false, "n": 1, "negative_prompt": "", "size": "1280*1280" } }' ``` |
| --- | --- |
| ##### Request headers |
| **Content-Type** `*string*` **(Required)** The content type of the request. Must be `application/json`. |
| **Authorization** `*string*` **(Required)** Authenticates the request with a Model Studio API key. Example: Bearer sk-xxxx. |
| ##### Request body |
| **model** `*string*` **(Required)** The model name. Example: wan2.6-t2i. **Note** For wan2.5 and earlier models, see [HTTP asynchronous call](#0d8029dcc8pxl) for HTTP calls. |
| **input** `*object*` **(Required)** The input object. **Properties** **messages** `*array*` **(Required)** The request messages. Currently, only single-turn conversations are supported: pass one set of role and content parameters. **Properties** **role** `*string*` **(Required)** The message role. Must be set to `user`. **content** `*array*` **(Required)** The message content array. **Properties** **text** `*string*` **(Required)** The positive prompt describing the desired content, style, and composition of the generated image. Supports Chinese and English, with a maximum length of 2,100 characters. Each Chinese character, letter, number, or symbol counts as one character. Excess characters are automatically truncated. Example: A sitting orange cat, happy, lively, and cute, realistic and accurate. **Note**: Only one text input is supported. An error will occur if you do not provide a text input or if you provide multiple text inputs. |
| **parameters** `*object*` (Optional) Image generation parameters. **Properties** **negative\\_prompt** `*string*` (optional) A negative prompt describing what you do not want in the image. Supports Chinese and English. Maximum length is 500 characters. Excess characters are truncated automatically. Example: Low resolution, low quality, distorted limbs, malformed fingers, oversaturated colors, wax-like appearance, no facial details, overly smooth surfaces, AI-generated look. Chaotic composition. Blurry or distorted text. **size** `*string*` (Optional) The resolution of the output image, in the format `**width*height**`. - The default value is `1280*1280`. - The total pixels must be between 1280×1280 and 1440×1440, with an aspect ratio between 1:4 and 4:1. For example, 768×2700 is a valid resolution. Example: 1280\\*1280. **Recommended resolutions for common aspect ratios** - 1:1: 1280×1280 - 3:4: 1104×1472 - 4:3: 1472×1104 - 9:16: 960×1696 - 16:9: 1696×960 **n** `*integer*` (Optional) **Important** The value of n directly affects the cost. Cost = Unit Price × Number of Images. Before you call the API, confirm the [model pricing](/help/en/model-studio/model-pricing#0006b52b83ua9). The number of images to generate. The value must be an integer from 1 to 4. The default is `4`. Billing is based on the number of images generated. Set to 1 for testing. **prompt\\_extend** `*bool*` (Optional) Enables prompt rewriting. An LLM optimizes the positive prompt to improve results, especially for shorter prompts. Adds 3-4 seconds to processing time. - true (default) - false **watermark** `*bool*` (Optional) Adds an "AI Generated" watermark to the lower-right corner of the image. - false (default) - true **seed** `*integer*` (optional) Random number seed. Valid range: `[0,2147483647]`. Using the same `seed` yields similar outputs. If omitted, the algorithm uses a random seed. **Note:** Image generation is probabilistic. Even with the same `seed`, results may vary. |

| #### Response parameters | ## Successful task execution Task data (task status and image URLs) is retained for only 24 hours and then automatically purged. Save generated images promptly. ``` { "output": { "choices": [ { "finish_reason": "stop", "message": { "content": [ { "image": "https://dashscope-result-bj.oss-cn-beijing.aliyuncs.com/xxxx.png?Expires=xxx", "type": "image" } ], "role": "assistant" } } ], "finished": true }, "usage": { "image_count": 1, "input_tokens": 0, "output_tokens": 0, "size": "1280*1280", "total_tokens": 0 }, "request_id": "815505c6-7c3d-49d7-b197-xxxxx" } ``` ## Task execution failed If the task fails, the API returns error information. Identify the cause from the code and message fields. See [Error codes](/help/en/model-studio/error-code). ``` { "request_id": "a4d78a5f-655f-9639-8437-xxxxxx", "code": "InvalidParameter", "message": "num_images_per_prompt must be 1" } ``` |
| --- | --- |
| **output** `*object*` The output object. **Properties** **choices** `*array*` The output content generated by the model. **Properties** **finish\\_reason** `*string*` The reason the task stopped. `stop` indicates normal completion. **message** `*object*` The message returned by the model. **Properties** **role** `*string*` The message role, fixed as `assistant`. **content** `*array*` **Properties** **image** `*string*` The URL of the generated image in PNG format. **Valid for 24 hours.** Download and save the image promptly. **type** `*string*` The output type, fixed as image. **finished** `*boolean*` Whether the task has finished. - true - false |
| **usage** `*object*` Usage statistics for the request. Only successful results are counted. **Properties** **image\\_count** `*integer*` The number of generated images. **size** `*string*` The resolution of the generated image. Example: 1280\\*1280. **input\\_tokens** `*integer*` The number of input tokens. For text-to-image, billing is based on the number of images, so this value is fixed at 0. **output\\_tokens** `*integer*` The number of output tokens. For text-to-image, billing is based on the number of images, so this value is fixed at 0. **total\\_tokens** `*integer*` The total number of tokens. For text-to-image, billing is based on the number of images, so this value is fixed at 0. |
| **request\\_id** `*string*` Unique request identifier for tracing and troubleshooting. |
| **code** `*string*` Error code. Returned only for failed requests. See [Error codes](/help/en/model-studio/error-code). |
| **message** `*string*` Detailed error message. Returned only for failed requests. See [Error codes](/help/en/model-studio/error-code). |

## **HTTP asynchronous (wan2.6)**

**Important**

The API in this section uses the **new protocol** and supports only the **wan2.6** model.

The task flow includes two core steps: **Create task -> Poll for result**. The process is as follows:

### Step 1: Create a task and get the task ID

#### Singapore

`POST https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/services/aigc/image-generation/generation`

When calling, replace `{WorkspaceId}` with your actual [workspace ID](/help/en/model-studio/obtain-the-app-id-and-workspace-id#d3eb3cd37b7fu).

#### US (Virginia)

`POST https://dashscope-us.aliyuncs.com/api/v1/services/aigc/image-generation/generation`

#### China (Beijing)

`POST https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api/v1/services/aigc/image-generation/generation`

When calling, replace `{WorkspaceId}` with your actual [workspace ID](/help/en/model-studio/obtain-the-app-id-and-workspace-id#d3eb3cd37b7fu).

#### Germany (Frankfurt)

`POST https://<u>{WorkspaceId}.eu-central-1.maas.aliyuncs.com</u>/api/v1/services/aigc/image-generation/generation`

When you make a call, replace `{WorkspaceId}` with your [Workspace ID](/help/en/model-studio/obtain-the-app-id-and-workspace-id#d3eb3cd37b7fu).

**Note**

-   After the task is created, use the returned `task_id` to query the result. The `task_id` is valid for 24 hours. **Do not create duplicate tasks**. Instead, use polling to retrieve the result.
    
-   For guidance for beginners, see [Call APIs with Postman or cURL](/help/en/model-studio/first-call-to-image-and-video-api).
    

| #### Request parameters | ## **Text-to-image** ``` curl --location 'https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/services/aigc/image-generation/generation' \\ --header 'Content-Type: application/json' \\ --header "Authorization: Bearer $DASHSCOPE_API_KEY" \\ --header 'X-DashScope-Async: enable' \\ --data '{ "model": "wan2.6-t2i", "input": { "messages": [ { "role": "user", "content": [ { "text": "A flower shop with exquisite windows, a beautiful wooden door, and flowers on display" } ] } ] }, "parameters": { "prompt_extend": true, "watermark": false, "n": 1, "negative_prompt": "", "size": "1280*1280" } }' ``` |
| --- | --- |
| ##### Request headers |
| **Content-Type** `*string*` **(Required)** The content type of the request. Must be `application/json`. |
| **Authorization** `*string*` **(Required)** Authenticates the request with a Model Studio API key. Example: Bearer sk-xxxx. |
| **X-DashScope-Async** `*string*` **(Required)** Enables asynchronous processing. HTTP requests support only asynchronous calls. Must be `enable`. **Important** If this request header is missing, the error "current user api does not support synchronous calls" is returned. |
| ##### Request body |
| **model** `*string*` **(Required)** The model name. Example: wan2.6-t2i. **Note** For wan2.5 and earlier models, see [HTTP asynchronous call.](#0d8029dcc8pxl) |
| **input** `*object*` **(Required)** The input object. **Properties** **messages** `*array*` **(Required)** The request messages. Currently, only single-turn conversations are supported: pass one set of role and content parameters. **Properties** **role** `*string*` **(Required)** The message role. Must be set to `user`. **content** `*array*` **(Required)** The message content array. **Properties** **text** `*string*` **(Required)** The positive prompt describing the desired content, style, and composition of the generated image. Supports Chinese and English, with a maximum length of 2,100 characters. Each Chinese character, letter, number, or symbol counts as one character. Excess characters are automatically truncated. Example: A flower shop with exquisite windows, a beautiful wooden door, and flowers on display. **Note**: Only one text input is supported. An error will occur if you do not provide a text input or if you provide multiple text inputs. |
| **parameters** `*object*` (Optional) Image generation parameters. **Properties** **negative\\_prompt** `*string*` (optional) A negative prompt describing what you do not want in the image. Supports Chinese and English. Maximum length is 500 characters. Excess characters are truncated automatically. Example: Low resolution, low quality, distorted limbs, malformed fingers, oversaturated colors, wax-like appearance, no facial details, overly smooth surfaces, AI-generated look. Chaotic composition. Blurry or distorted text. **size** `*string*` (Optional) The resolution of the output image, in the format `**width*height**`. - The default value is `1280*1280`. - The total pixels must be between 1280×1280 and 1440×1440, with an aspect ratio between 1:4 and 4:1. For example, 768×2700 is a valid resolution. Example: 1280\\*1280. **Recommended resolutions for common aspect ratios** - 1:1: 1280×1280 - 3:4: 1104×1472 - 4:3: 1472×1104 - 9:16: 960×1696 - 16:9: 1696×960 **n** `*integer*` (Optional) **Important** The value of n directly affects the cost. Cost = Unit Price × Number of Images. Before you call the API, confirm the [model pricing](/help/en/model-studio/model-pricing#0006b52b83ua9). The number of images to generate. The value must be an integer from 1 to 4. The default is `4`. Billing is based on the number of images generated. Set to 1 for testing. **prompt\\_extend** `*bool*` (Optional) Enables prompt rewriting. An LLM optimizes the positive prompt to improve results, especially for shorter prompts. Adds 3-4 seconds to processing time. - true (default) - false **watermark** `*bool*` (Optional) Adds an "AI Generated" watermark to the lower-right corner of the image. - false (default) - true **seed** `*integer*` (optional) Random number seed. Valid range: `[0,2147483647]`. Using the same `seed` yields similar outputs. If omitted, the algorithm uses a random seed. **Note:** Image generation is probabilistic. Even with the same `seed`, results may vary. |

| #### Response parameters | ### Successful response Save the `task_id` to query the task status and result. ``` { "output": { "task_status": "PENDING", "task_id": "0385dc79-5ff8-4d82-bcb6-xxxxxx" }, "request_id": "4909100c-7b5a-9f92-bfe5-xxxxxx" } ``` ### Error response Task creation failed. See [Error codes](/help/en/model-studio/error-code). ``` { "code": "InvalidApiKey", "message": "No API-key provided.", "request_id": "7438d53d-6eb8-4596-8835-xxxxxx" } ``` |
| --- | --- |
| **output** `*object*` The output object. **Properties** **task\\_id** `*string*` The task ID. Valid for queries for 24 hours. **task\\_status** `*string*` The status of the task. **Enumeration values** - PENDING - RUNNING - SUCCEEDED - FAILED - CANCELED - UNKNOWN: The task does not exist or its status is unknown. |
| **request\\_id** `*string*` Unique request identifier for tracing and troubleshooting. |
| **code** `*string*` Error code. Returned only for failed requests. See [Error codes](/help/en/model-studio/error-code). |     |
| **message** `*string*` Detailed error message. Returned only for failed requests. See [Error codes](/help/en/model-studio/error-code). |     |

### Step 2: Query the result by task ID

#### **Singapore**

`GET https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/tasks/{task_id}`

When calling, replace `{WorkspaceId}` with your actual [workspace ID](/help/en/model-studio/obtain-the-app-id-and-workspace-id#d3eb3cd37b7fu).

#### US (Virginia)

`GET https://dashscope-us.aliyuncs.com/api/v1/tasks/{task_id}`

#### China (Beijing)

`GET https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api/v1/tasks/{task_id}`

When calling, replace `{WorkspaceId}` with your actual [workspace ID](/help/en/model-studio/obtain-the-app-id-and-workspace-id#d3eb3cd37b7fu).

#### Germany (Frankfurt)

`GET https://{WorkspaceId}.eu-central-1.maas.aliyuncs.com/api/v1/tasks/{task_id}`

When you make a call, replace `{WorkspaceId}` with your actual [Workspace ID](/help/en/model-studio/obtain-the-app-id-and-workspace-id#d3eb3cd37b7fu).

**Note**

-   **Polling recommendation**: Image generation is time-consuming. Use a polling mechanism with a reasonable interval, such as 10 seconds.
    
-   **Task state transition**: PENDING → RUNNING → SUCCEEDED or FAILED.
    
-   **Result link**: After a task succeeds, an image URL valid for **24 hours** is returned. Download and save the image to permanent storage, such as [OSS](/help/en/oss/user-guide/what-is-oss).
    

| #### Request parameters | ## Query task result Replace `{task_id}` with the `task_id` value returned by the previous API call. The `task_id` is valid for queries for 24 hours, Replace `{WorkspaceId}` with your actual [workspace ID](/help/en/model-studio/obtain-the-app-id-and-workspace-id#d3eb3cd37b7fu). ``` curl -X GET https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/tasks/{task_id} \\ --header "Authorization: Bearer $DASHSCOPE_API_KEY" ``` |
| --- | --- |
| ##### **Request headers** |
| **Authorization** `*string*` **(Required)** Authenticates the request with a Model Studio API key. Example: Bearer sk-xxxx. |
| ##### **URL path parameters** |
| **task\\_id** `*string*` **(Required)** The ID of the task. |

| #### Response parameters | ## Successful task execution Task data (task status and image URLs) is retained for only 24 hours and then automatically purged. Save generated images promptly. ``` { "request_id": "2ddf53fa-699a-4267-9446-xxxxxx", "output": { "task_id": "3cd3fa4e-53ee-4136-9cab-xxxxxx", "task_status": "SUCCEEDED", "submit_time": "2025-12-18 20:03:01.802", "scheduled_time": "2025-12-18 20:03:01.834", "end_time": "2025-12-18 20:03:29.260", "finished": true, "choices": [ { "finish_reason": "stop", "message": { "role": "assistant", "content": [ { "image": "https://dashscope-result-bj.oss-cn-beijing.aliyuncs.com/xxx.png?Expires=xxx", "type": "image" } ] } } ] }, "usage": { "size": "1280*1280", "total_tokens": 0, "image_count": 1, "output_tokens": 0, "input_tokens": 0 } } ``` ## Task execution failed If the task fails, the API returns error information. Identify the cause from the code and message fields. See [Error codes](/help/en/model-studio/error-code). ``` { "code": "InvalidApiKey", "message": "No API-key provided.", "request_id": "7438d53d-6eb8-4596-8835-xxxxxx" } ``` |
| --- | --- |
| **output** `*object*` The task output information. **Properties** **task\\_id** `*string*` The task ID. Valid for queries for 24 hours. **task\\_status** `*string*` The status of the task. **Enumeration values** - PENDING - RUNNING - SUCCEEDED - FAILED - CANCELED - UNKNOWN: The task does not exist or its status is unknown. **State transitions during polling:** - PENDING → RUNNING → SUCCEEDED or FAILED. - The initial query status is usually PENDING or RUNNING. - When the status changes to SUCCEEDED, the response contains the generated image URL. - If the status is FAILED, check the error message and retry the task. **submit\\_time** `*string*` The time when the task was submitted. The time is in UTC+8 and the format is YYYY-MM-DD HH:mm:ss.SSS. **scheduled\\_time** `*string*` The time when the task was executed. The time is in UTC+8 and the format is YYYY-MM-DD HH:mm:ss.SSS. **end\\_time** `*string*` The time when the task was completed. The time is in UTC+8 and the format is YYYY-MM-DD HH:mm:ss.SSS. **finished** `*boolean*` Indicates whether the task is finished. - true - false **choices** `*array*` The output content generated by the model. **Properties** **finish\\_reason** `*string*` The reason the task stopped. `stop` indicates normal completion. **message** `*object*` The message returned by the model. **Properties** **role** `*string*` The role of the message, which is fixed as `assistant`. **content** `*array*` **Properties** **image** `*string*` The URL of the generated image in PNG format. **The link is valid for 24 hours.** You must download and save the image promptly. **type** `*string*` The type of output, which is fixed as image. |
| **usage** `*object*` Usage statistics for the request. **Only successful results are counted.** **Properties** **image\\_count** `*integer*` The number of generated images. **size** `*string*` The resolution of the generated image. Example: 1280\\*1280. **input\\_tokens** `*integer*` The number of input tokens. This value is currently fixed at 0. **output\\_tokens** `*integer*` The number of output tokens. This value is currently fixed at 0. **total\\_tokens** `*integer*` The total number of tokens. This value is currently fixed at 0. |
| **request\\_id** `*string*` Unique request identifier for tracing and troubleshooting. |
| **code** `*string*` Error code. Returned only for failed requests. See [Error codes](/help/en/model-studio/error-code). |
| **message** `*string*` Detailed error message. Returned only for failed requests. See [Error codes](/help/en/model-studio/error-code). |

## **HTTP asynchronous (wan2.5 and earlier models)**

**Important**

This API uses the **old protocol** and supports only **wan2.5 and earlier models**.

Because text-to-image tasks can take significant time (typically 1 to 2 minutes), the API uses an asynchronous call. The flow includes two core steps: **Create task -> Poll for result**. The process is as follows:

> Processing time depends on the task queue and service status.

### Step 1: Create a task and get the task ID

## **Singapore**

`POST https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis`

## **Beijing**

`POST https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis`

**Note**

-   After the task is created, use the returned `task_id` to query the result. The `task_id` is valid for 24 hours. **Do not create duplicate tasks**. Instead, use polling to retrieve the result.
    
-   For guidance for beginners, see [Call APIs with Postman or cURL](/help/en/model-studio/first-call-to-image-and-video-api).
    

| #### Request parameters | ## Text-to-image > The API keys for the Singapore and Beijing regions are different. [Obtain an API key](/help/en/model-studio/get-api-key) > The following is the URL for the Singapore region. If you are using a model in the Beijing region, replace the URL with: https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis Replace `{WorkspaceId}` with your actual [workspace ID](/help/en/model-studio/obtain-the-app-id-and-workspace-id#d3eb3cd37b7fu). ``` curl -X POST https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis \\ -H 'X-DashScope-Async: enable' \\ -H "Authorization: Bearer $DASHSCOPE_API_KEY" \\ -H 'Content-Type: application/json' \\ -d '{ "model": "wan2.5-t2i-preview", "input": { "prompt": "A flower shop with exquisite windows, a beautiful wooden door, and flowers on display" }, "parameters": { "size": "1280*1280", "n": 1 } }' ``` ## Text-to-image (with negative prompt) Use negative\\_prompt to prevent "people" from appearing in the generated image. > The API keys for the Singapore and Beijing regions are different. [Obtain an API key](/help/en/model-studio/get-api-key) > The following is the URL for the Singapore region. If you are using a model in the Beijing region, replace the URL with: https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis Replace `{WorkspaceId}` with your actual [workspace ID](/help/en/model-studio/obtain-the-app-id-and-workspace-id#d3eb3cd37b7fu). ``` curl -X POST https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis \\ -H 'X-DashScope-Async: enable' \\ -H "Authorization: Bearer $DASHSCOPE_API_KEY" \\ -H 'Content-Type: application/json' \\ -d '{ "model": "wan2.2-t2i-flash", "input": { "prompt": "Snowy ground, a small white chapel, aurora borealis, winter scene, soft light.", "negative_prompt": "people" }, "parameters": { "size": "1024*1024", "n": 1 } }' ``` |
| --- | --- |
| ##### Request headers |
| **Content-Type** `*string*` **(Required)** The content type of the request. Must be `application/json`. |
| **Authorization** `*string*` **(Required)** Authenticates the request with a Model Studio API key. Example: Bearer sk-xxxx. |
| **X-DashScope-Async** `*string*` **(Required)** Enables asynchronous processing. HTTP requests support only asynchronous calls. Must be `enable`. **Important** If this request header is missing, the error "current user api does not support synchronous calls" is returned. |
| ##### Request body |
| **model** `*string*` (Required) The model name. For text-to-image models, see [Model List](/help/en/model-studio/wanx-image-edit-api-reference). Example: wan2.5-t2i-preview. **Note** For HTTP calls to the wan2.6 model, see [HTTP synchronous call](#39337f0fd0wzt) and [HTTP asynchronous call](#9c68ccc525nta). |
| **input** `*object*` (Required) The input object containing the prompt. **Properties** **prompt** `*string*` **(Required)** The positive prompt describing the desired content and style of the generated image. This parameter supports Chinese and English. Each Chinese character, letter, or punctuation mark counts as one character. Excess characters are automatically truncated. The length limit varies by model version: - wan2.5-t2i-preview: Maximum length of 2000 characters. - wan2.2 and wan2.1 series models: Maximum length of 500 characters. - wanx2.0-t2i-turbo: Maximum length of 800 characters. Example: A sitting orange cat, happy, lively, and cute, realistic and accurate. For tips on using prompts, see [Text-to-image Prompt Guide](/help/en/model-studio/text-to-image-prompt). **negative\\_prompt** `*string*` (Optional) The negative prompt specifying content to exclude from the image. Use this to constrain the output. This parameter supports Chinese and English, with a maximum length of 500 characters. Excess characters are automatically truncated. Example: low resolution, error, worst quality, low quality, mutilated, extra fingers, bad proportions, etc. |
| **parameters** `*object*` (Optional) The image generation parameters. **Properties** **size** `*string*` (Optional) The resolution of the output image, in the format `**width*height**`. The default value and constraints vary by model version: - wan2.5-t2i-preview: The default value is `1280*1280`. The total pixels must be between 1280×1280 and 1440×1440, with an aspect ratio between 1:4 and 4:1. For example, 768×2700 is a valid resolution. - wan2.2 and earlier models: The default value is `1024*1024`. The image width and height must be between 512 and 1440, with a maximum resolution of 1440×1440. For example, 768×2700 exceeds the single-side limit and is not supported. Example: 1280\\*1280. **Recommended resolutions for common aspect ratios** The following resolutions apply to wan2.5-t2i-preview: - 1:1: 1280×1280 - 3:4: 1104×1472 - 4:3 (1472 × 1104) - 9:16: 960×1696 - 16:9: 1696×960 **n** `*integer*` (Optional) **Important** The value of n directly affects the cost. Cost = Unit Price × Number of Images. Before you call the API, confirm the [model pricing](/help/en/model-studio/model-pricing#0006b52b83ua9). The number of images to generate. The value must be an integer from 1 to 4. The default is `4`. Set to 1 for testing. **prompt\\_extend** `*boolean*` (Optional) Enables prompt rewriting. An LLM rewrites the input prompt to improve results, especially for shorter prompts. Increases processing time. - true (default) - false **watermark** `*boolean*` (Optional) Adds an "AI Generated" watermark to the lower-right corner of the image. - false (default) - true **seed** `*integer*` (optional) Random number seed. Valid range: `[0,2147483647]`. Using the same `seed` yields similar outputs. If omitted, the algorithm uses a random seed. **Note:** Image generation is probabilistic. Even with the same `seed`, results may vary. |

| #### Response parameters | ## Successful response Save the `task_id` to query the task status and result. ``` { "output": { "task_status": "PENDING", "task_id": "0385dc79-5ff8-4d82-bcb6-xxxxxx" }, "request_id": "4909100c-7b5a-9f92-bfe5-xxxxxx" } ``` ## Error response Task creation failed. See [Error codes](/help/en/model-studio/error-code). ``` { "code": "InvalidApiKey", "message": "No API-key provided.", "request_id": "7438d53d-6eb8-4596-8835-xxxxxx" } ``` |
| --- | --- |
| **output** `*object*` The task output information. **Properties** **task\\_id** `*string*` The task ID. Valid for queries for 24 hours. **task\\_status** `*string*` The status of the task. **Enumeration values** - PENDING - RUNNING - SUCCEEDED - FAILED - CANCELED - UNKNOWN: The task does not exist or its status is unknown. |
| **request\\_id** `*string*` Unique request identifier for tracing and troubleshooting. |
| **code** `*string*` Error code. Returned only for failed requests. See [Error codes](/help/en/model-studio/error-code). |
| **message** `*string*` Detailed error message. Returned only for failed requests. See [Error codes](/help/en/model-studio/error-code). |

### Step 2: Query the result by task ID

#### **Singapore**

`GET https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/tasks/{task_id}`

When calling, replace `{WorkspaceId}` with your actual [workspace ID](/help/en/model-studio/obtain-the-app-id-and-workspace-id#d3eb3cd37b7fu).

#### China (Beijing)

`GET https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api/v1/tasks/{task_id}`

When calling, replace `{WorkspaceId}` with your actual [workspace ID](/help/en/model-studio/obtain-the-app-id-and-workspace-id#d3eb3cd37b7fu).

**Note**

-   **Polling recommendation**: Image generation is time-consuming. Use a polling mechanism with a reasonable interval, such as 10 seconds.
    
-   **Task state transition**: PENDING → RUNNING → SUCCEEDED or FAILED.
    
-   **Result link**: After a task succeeds, an image URL valid for **24 hours** is returned. Download and save the image to permanent storage, such as [OSS](/help/en/oss/user-guide/what-is-oss).
    

| #### Request parameters | ## Query task result Replace `86ecf553-d340-4e21-xxxxxxxxx` with your actual `task_id`. > API keys are different for each region. For more information, see [Obtain an API key](/help/en/model-studio/get-api-key). > If you use a model in the China (Beijing) region, replace `base_url` with `https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api/v1/tasks/86ecf553-d340-4e21-xxxxxxxxx`, where {WorkspaceId} is your actual workspace ID. ``` curl -X GET https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/tasks/86ecf553-d340-4e21-xxxxxxxxx \\ --header "Authorization: Bearer $DASHSCOPE_API_KEY" ``` |
| --- | --- |
| ##### **Request headers** |
| **Authorization** `*string*` **(Required)** Authenticates the request with a Model Studio API key. Example: Bearer sk-xxxx. |
| ##### **URL path parameters** |
| **task\\_id** `*string*` **(Required)** The ID of the task. |

| #### **Response parameters** | ## Successful task execution Image URLs are valid for only 24 hours and then automatically purged. Save generated images promptly. ``` { "request_id": "f767d108-7d50-908b-a6d9-xxxxxx", "output": { "task_id": "d492bffd-10b5-4169-b639-xxxxxx", "task_status": "SUCCEEDED", "submit_time": "2025-01-08 16:03:59.840", "scheduled_time": "2025-01-08 16:03:59.863", "end_time": "2025-01-08 16:04:10.660", "results": [ { "orig_prompt": "A flower shop with exquisite windows, a beautiful wooden door, and flowers on display", "actual_prompt": "A flower shop with exquisitely carved windows and a beautiful dark wooden door with a brass handle. Inside, various flowers are displayed, including roses, lilies, and sunflowers, which are colorful and vibrant. The background is a warm indoor scene, with light visible from the street through the window. High-definition realistic photography, medium shot composition.", "url": "https://dashscope-result-wlcb.oss-cn-wulanchabu.aliyuncs.com/1.png" } ], "task_metrics": { "TOTAL": 1, "SUCCEEDED": 1, "FAILED": 0 } }, "usage": { "image_count": 1 } } ``` ## Task failed When a task fails, `task_status` is FAILED with an error code and message. See [Error codes](/help/en/model-studio/error-code). ``` { "request_id": "e5d70b02-ebd3-98ce-9fe8-759d7d7b107d", "output": { "task_id": "86ecf553-d340-4e21-af6e-xxxxxx", "task_status": "FAILED", "code": "InvalidParameter", "message": "xxxxxx", "task_metrics": { "TOTAL": 4, "SUCCEEDED": 0, "FAILED": 4 } } } ``` ## Partial task failure The model can generate multiple images per task. If at least one succeeds, the task status is `SUCCEEDED` and URLs of successful images are returned. Failed images include a failure reason. Usage statistics count only successful results. See [Error codes](/help/en/model-studio/error-code). ``` { "request_id": "85eaba38-0185-99d7-8d16-xxxxxx", "output": { "task_id": "86ecf553-d340-4e21-af6e-xxxxxx", "task_status": "SUCCEEDED", "results": [ { "url": "https://dashscope-result-bj.oss-cn-beijing.aliyuncs.com/123/a1.png" }, { "code": "InternalError.Timeout", "message": "An internal timeout error has occurred during execution, please try again later or contact service support." } ], "task_metrics": { "TOTAL": 2, "SUCCEEDED": 1, "FAILED": 1 } }, "usage": { "image_count": 1 } } ``` ## Task query expired The `task_id` is valid for 24 hours. After this period, queries return the following error. ``` { "request_id": "a4de7c32-7057-9f82-8581-xxxxxx", "output": { "task_id": "502a00b1-19d9-4839-a82f-xxxxxx", "task_status": "UNKNOWN" } } ``` |
| --- | --- |
| **output** `*object*` The task output information. **Properties** **task\\_id** `*string*` The task ID. Valid for queries for 24 hours. **task\\_status** `*string*` The status of the task. **Enumeration values** - PENDING - RUNNING - SUCCEEDED - FAILED - CANCELED - UNKNOWN: The task does not exist or its status is unknown. **State transitions during polling:** - PENDING → RUNNING → SUCCEEDED or FAILED. - The initial query status is usually PENDING or RUNNING. - When the status changes to SUCCEEDED, the response contains the generated image URL. - If the status is FAILED, check the error message and retry the task. **submit\\_time** `*string*` The time when the task was submitted. The time is in UTC+8 and the format is YYYY-MM-DD HH:mm:ss.SSS. **scheduled\\_time** `*string*` The time when the task was executed. The time is in UTC+8 and the format is YYYY-MM-DD HH:mm:ss.SSS. **end\\_time** `*string*` The time when the task was completed. The time is in UTC+8 and the format is YYYY-MM-DD HH:mm:ss.SSS. **results** `*array of object*` A list of task results. This includes image URLs, prompts, and error messages for partially failed tasks. **Data structure** ``` { "results": [ { "orig_prompt": "", "actual_prompt": "", "url": "" }, { "code": "", "message": "" } ] } ``` **Properties** **orig\\_prompt** `*string*` The original input prompt, corresponding to the request parameter `prompt`. **actual\\_prompt** `*string*` The optimized prompt used when prompt rewriting is enabled. Not returned when disabled. **url** `*string*` The image URL. This is returned only when task\\_status is SUCCEEDED. The link is valid for 24 hours and can be used to download the image. **code** `*string*` Error code. Returned only for failed requests. See [Error codes](/help/en/model-studio/error-code). **message** `*string*` Detailed error message. Returned only for failed requests. See [Error codes](/help/en/model-studio/error-code). **task\\_metrics** `*object*` Statistics for the task result. **Properties** **TOTAL** `*integer*` The total number of tasks. **SUCCEEDED** `*integer*` The number of successful tasks. **FAILED** `*integer*` The number of failed tasks. **code** `*string*` Error code. Returned only for failed requests. See [Error codes](/help/en/model-studio/error-code). **message** `*string*` Detailed error message. Returned only for failed requests. See [Error codes](/help/en/model-studio/error-code). |
| **usage** `*object*` Usage statistics for the request. Only successful results are counted. **Properties** **image\\_count** `*integer*` Number of images successfully generated. Billing: Cost = Number of images × Unit price. |
| **request\\_id** `*string*` Unique request identifier for tracing and troubleshooting. |

## **DashScope Python SDK**

The SDK parameter names align with the HTTP API, with structures adapted for Python.

Because text-to-image tasks can take significant time, the SDK encapsulates the HTTP asynchronous call process and supports both synchronous and asynchronous calls.

> Processing time depends on the task queue and service status.

### **wan2.6**

**Important**

-   The following code is only for the **wan2.6** model.
    
-   Make sure your DashScope Python SDK version is **at least 1.25.7** before you run the following code. To update, see [Install the SDK](/help/en/model-studio/install-sdk).
    

The `base_url` and API key are region-specific. The following example shows a call in the Singapore region:

#### Singapore

`https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1`

When calling, replace `{WorkspaceId}` with your actual [workspace ID](/help/en/model-studio/obtain-the-app-id-and-workspace-id#d3eb3cd37b7fu).

#### US (Virginia)

`https://dashscope-us.aliyuncs.com/api/v1`

#### **China (Beijing)**

`https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api/v1`

When calling, replace `{WorkspaceId}` with your actual [workspace ID](/help/en/model-studio/obtain-the-app-id-and-workspace-id#d3eb3cd37b7fu).

#### Germany (Frankfurt)

`https://{WorkspaceId}.eu-central-1.maas.aliyuncs.com/api/v1`

Replace `{WorkspaceId}` with your actual [Workspace ID](/help/en/model-studio/obtain-the-app-id-and-workspace-id#d3eb3cd37b7fu).

> The global deployment scope (Frankfurt region) supports only asynchronous calls.

## **Synchronous call**

##### **Request example**

```
import os
import dashscope
from dashscope.aigc.image_generation import ImageGeneration
from dashscope.api_entities.dashscope_response import Message

# The following URL is for the Singapore region. When calling, replace {WorkspaceId} with your actual workspace ID. URLs vary by region.
dashscope.base_http_api_url = 'https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1'

# If you have not configured an environment variable, replace the following line with your Model Studio API key: api_key="sk-xxx"
# The API key is region-specific. To obtain an API key: https://www.alibabacloud.com/help/en/model-studio/get-api-key
api_key = os.getenv("DASHSCOPE_API_KEY")

message = Message(
    role="user",
    content=[
        {
            'text': 'A flower shop with exquisite windows, a beautiful wooden door, and flowers on display'
        }
    ]
)
print("----Sync call, please wait a moment----")
rsp = ImageGeneration.call(
    model="wan2.6-t2i",
    api_key=api_key,
    messages=[message],
    negative_prompt="",
    prompt_extend=True,
    watermark=False,
    n=1,
    size="1280*1280"
)
print(rsp)
```

##### Response example

> The URL is valid for 24 hours. You must download the image promptly.

```
{
    "status_code": 200,
    "request_id": "820dd0db-eb42-4e05-8d6a-1ddb4axxxxxx",
    "code": "",
    "message": "",
    "output": {
        "text": null,
        "finish_reason": null,
        "choices": [
            {
                "finish_reason": "stop",
                "message": {
                    "role": "assistant",
                    "content": [
                        {
                            "image": "https://dashscope-result-bj.oss-cn-beijing.aliyuncs.com/xxxxxx.png?Expires=xxxxxx",
                            "type": "image"
                        }
                    ]
                }
            }
        ],
        "audio": null,
        "finished": true
    },
    "usage": {
        "input_tokens": 0,
        "output_tokens": 0,
        "characters": 0,
        "image_count": 1,
        "size": "1280*1280",
        "total_tokens": 0
    }
}
```

## **Asynchronous call**

##### **Request example**

```
import os
import dashscope
from dashscope.aigc.image_generation import ImageGeneration
from dashscope.api_entities.dashscope_response import Role, Message
from http import HTTPStatus

# The following URL is for the Singapore region. When calling, replace {WorkspaceId} with your actual workspace ID. URLs vary by region.
dashscope.base_http_api_url = 'https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1'

# If you have not configured an environment variable, replace the following line with your Model Studio API key: api_key="sk-xxx"
# The API key is region-specific. To obtain an API key: https://www.alibabacloud.com/help/en/model-studio/get-api-key
api_key = os.getenv("DASHSCOPE_API_KEY")

# Create an asynchronous task
def create_async_task():
    print("Creating async task...")
    message = Message(
        role="user",
        content=[{'text': 'A flower shop with exquisite windows, a beautiful wooden door, and flowers on display'}]
    )
    response = ImageGeneration.async_call(
        model="wan2.6-t2i",
        api_key=api_key,
        messages=[message],
        negative_prompt="",
        prompt_extend=True,
        watermark=False,
        n=1,
        size="1280*1280"
    )
    
    if response.status_code == 200:
        print("Task created successfully:", response)
        return response
    else:
        raise Exception(f"Failed to create task: {response.code} - {response.message}")

# Wait for the task to complete
def wait_for_completion(task_response):
    print("Waiting for task completion...")
    status = ImageGeneration.wait(task=task_response, api_key=api_key)
    
    if status.output.task_status == "SUCCEEDED":
        print("Task succeeded!")
        print("Response:", status)
    else:
        raise Exception(f"Task failed with status: {status.output.task_status}")

# Fetch asynchronous task information
def fetch_task_status(task):
    print("Fetching task status...")
    status = ImageGeneration.fetch(task=task, api_key=api_key)
    
    if status.status_code == HTTPStatus.OK:
        print("Task status:", status.output.task_status)
        print("Response details:", status)
    else:
        print(f"Failed to fetch status: {status.code} - {status.message}")

# Cancel the asynchronous task
def cancel_task(task):
    print("Canceling task...")
    response = ImageGeneration.cancel(task=task, api_key=api_key)
    
    if response.status_code == HTTPStatus.OK:
        print("Task canceled successfully:", response.output.task_status)
    else:
        print(f"Failed to cancel task: {response.code} - {response.message}")

# Main execution flow
if __name__ == "__main__":
    task = create_async_task()
    wait_for_completion(task)
```

##### Response example

1.  Response example for creating a task
    
    ```
    {
        "status_code": 200,
        "request_id": "c4f11410-ea42-4996-957d-9c82f9xxxxxx",
        "code": "",
        "message": "",
        "output": {
            "text": null,
            "finish_reason": null,
            "choices": null,
            "audio": null,
            "task_id": "f470bbfd-d955-4165-935b-d35b8eexxxxxx",
            "task_status": "PENDING"
        },
        "usage": {
            "input_tokens": 0,
            "output_tokens": 0,
            "characters": 0
        }
    }
    ```
    
2.  Response example for querying a task result
    
    > The URL is valid for 24 hours. You must download the image promptly.
    
    ```
    {
        "status_code": 200,
        "request_id": "7e57e7e8-00b0-4534-9aff-fe31e0xxxxxx",
        "code": null,
        "message": "",
        "output": {
            "text": null,
            "finish_reason": null,
            "choices": [
                {
                    "finish_reason": "stop",
                    "message": {
                        "role": "assistant",
                        "content": [
                            {
                                "image": "https://dashscope-result-bj.oss-cn-beijing.aliyuncs.com/xxxxxx.png?Expires=xxxxxx",
                                "type": "image"
                            }
                        ]
                    }
                }
            ],
            "audio": null,
            "task_id": "f470bbfd-d955-4165-935b-d35b8exxxxxx",
            "task_status": "SUCCEEDED",
            "submit_time": "2026-01-09 17:18:17.901",
            "scheduled_time": "2026-01-09 17:18:17.941",
            "end_time": "2026-01-09 17:18:45.544",
            "finished": true
        },
        "usage": {
            "input_tokens": 0,
            "output_tokens": 0,
            "characters": 0,
            "size": "1280*1280",
            "total_tokens": 0,
            "image_count": 1
        }
    }
    ```
    

### **wan2.5 and earlier models**

**Important**

-   The following code is only for wan2.5 and earlier models.
    
-   Make sure your DashScope Python SDK version is **at least 1.25.2** before you run the following code.
    
    If the version is too low, errors such as "url error, please check url!" may occur. To update, see [Install the SDK](/help/en/model-studio/install-sdk).
    

The `base_url` and API key are region-specific. The following example shows a call in the Singapore region:

#### Singapore

`https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1`

When calling, replace `{WorkspaceId}` with your actual [workspace ID](/help/en/model-studio/obtain-the-app-id-and-workspace-id#d3eb3cd37b7fu).

#### China (Beijing)

`https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api/v1`

When calling, replace `{WorkspaceId}` with your actual [workspace ID](/help/en/model-studio/obtain-the-app-id-and-workspace-id#d3eb3cd37b7fu).

## **Synchronous call**

##### **Request example**

```
from http import HTTPStatus
from urllib.parse import urlparse, unquote
from pathlib import PurePosixPath
import requests
from dashscope import ImageSynthesis
import os
import dashscope

# The following URL is for the Singapore region. When calling, replace {WorkspaceId} with your actual workspace ID. URLs vary by region.
dashscope.base_http_api_url = 'https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1'

# If you have not configured an environment variable, replace the following line with your Model Studio API key: api_key="sk-xxx"
# The API keys for the Singapore and Beijing regions are different. To obtain an API key: https://www.alibabacloud.com/help/en/model-studio/get-api-key
api_key = os.getenv("DASHSCOPE_API_KEY")

print('----Sync call, please wait a moment----')
rsp = ImageSynthesis.call(api_key=api_key,
                          model="wan2.5-t2i-preview",
                          prompt="A flower shop with exquisite windows, a beautiful wooden door, and flowers on display",
                          negative_prompt="",
                          n=1,
                          size='1280*1280',
                          prompt_extend=True,
                          watermark=False,
                          seed=12345)
print('response: %s' % rsp)
if rsp.status_code == HTTPStatus.OK:
    # Save the image in the current directory
    for result in rsp.output.results:
        file_name = PurePosixPath(unquote(urlparse(result.url).path)).parts[-1]
        with open('./%s' % file_name, 'wb+') as f:
            f.write(requests.get(result.url).content)
else:
    print('sync_call Failed, status_code: %s, code: %s, message: %s' %
          (rsp.status_code, rsp.code, rsp.message))
```

##### Response example

> The URL is valid for 24 hours. You must download the image promptly.

```
{
    "status_code": 200,
    "request_id": "9d634fda-5fe9-9968-a908-xxxxxx",
    "code": null,
    "message": "",
    "output": {
        "task_id": "d35658e4-483f-453b-b8dc-xxxxxx",
        "task_status": "SUCCEEDED",
        "results": [{
            "url": "https://dashscope-result-wlcb.oss-cn-wulanchabu.aliyuncs.com/1.png",
            "orig_prompt": "A flower shop with exquisite windows, a beautiful wooden door, and flowers on display",
            "actual_prompt": "An exquisite flower shop, with elegant carvings on the windows and a beautiful wooden door with a brass handle. Inside, a variety of colorful flowers such as roses, tulips, and lilies are displayed. The background is a warm indoor scene with soft light, creating a peaceful and comfortable atmosphere. High-definition realistic photography, close-up center composition."
        }],
        "submit_time": "2025-01-08 19:36:01.521",
        "scheduled_time": "2025-01-08 19:36:01.542",
        "end_time": "2025-01-08 19:36:13.270",
        "task_metrics": {
            "TOTAL": 1,
            "SUCCEEDED": 1,
            "FAILED": 0
        }
    },
    "usage": {
        "image_count": 1
    }
}
```

## **Asynchronous call**

##### Request example

```
from http import HTTPStatus
from urllib.parse import urlparse, unquote
from pathlib import PurePosixPath
import requests
from dashscope import ImageSynthesis
import os
import dashscope

# The following URL is for the Singapore region. When calling, replace {WorkspaceId} with your actual workspace ID. URLs vary by region.
dashscope.base_http_api_url = 'https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1'

# If you have not configured an environment variable, replace the following line with your Model Studio API key: api_key="sk-xxx"
# The API keys for the Singapore and Beijing regions are different. To obtain an API key: https://www.alibabacloud.com/help/en/model-studio/get-api-key
api_key = os.getenv("DASHSCOPE_API_KEY")

def async_call():
    print('----Create task----')
    task_info = create_async_task()
    print('----Wait for task to complete, then save image----')
    wait_async_task(task_info)

# Create an asynchronous task
def create_async_task():
    rsp = ImageSynthesis.async_call(api_key=api_key,
                                    model="wan2.5-t2i-preview",
                                    prompt="A flower shop with exquisite windows, a beautiful wooden door, and flowers on display",
                                    negative_prompt="",
                                    n=1,
                                    size='1280*1280',
                                    prompt_extend=True,
                                    watermark=False,
                                    seed=12345)
    print(rsp)
    if rsp.status_code == HTTPStatus.OK:
        print(rsp.output)
    else:
        print('Failed, status_code: %s, code: %s, message: %s' %
              (rsp.status_code, rsp.code, rsp.message))
    return rsp

# Wait for the asynchronous task to finish
def wait_async_task(task):
    rsp = ImageSynthesis.wait(task=task, api_key=api_key)
    print(rsp)
    if rsp.status_code == HTTPStatus.OK:
        print(rsp.output)
        # save file to current directory
        for result in rsp.output.results:
            file_name = PurePosixPath(unquote(urlparse(result.url).path)).parts[-1]
            with open('./%s' % file_name, 'wb+') as f:
                f.write(requests.get(result.url).content)
    else:
        print('Failed, status_code: %s, code: %s, message: %s' %
              (rsp.status_code, rsp.code, rsp.message))

# Fetch asynchronous task information
def fetch_task_status(task):
    status = ImageSynthesis.fetch(task=task, api_key=api_key)
    print(status)
    if status.status_code == HTTPStatus.OK:
        print(status.output.task_status)
    else:
        print('Failed, status_code: %s, code: %s, message: %s' %
              (status.status_code, status.code, status.message))

# Cancel the asynchronous task. Only tasks in the PENDING state can be canceled.
def cancel_task(task):
    rsp = ImageSynthesis.cancel(task=task, api_key=api_key)
    print(rsp)
    if rsp.status_code == HTTPStatus.OK:
        print(rsp.output.task_status)
    else:
        print('Failed, status_code: %s, code: %s, message: %s' %
              (rsp.status_code, rsp.code, rsp.message))

if __name__ == '__main__':
    async_call()
```

##### Response example

1.  Response example for creating a task
    
    ```
    {
    	"status_code": 200,
    	"request_id": "31b04171-011c-96bd-ac00-f0383b669cc7",
    	"code": "",
    	"message": "",
    	"output": {
    		"task_id": "4f90cf14-a34e-4eae-xxxxxxxx",
    		"task_status": "PENDING",
    		"results": []
    	},
    	"usage": null
    }
    ```
    
2.  Response example for querying a task result
    
    > The URL is valid for 24 hours. You must download the image promptly.
    
    ```
    {
        "status_code": 200,
        "request_id": "9d634fda-5fe9-9968-a908-xxxxxx",
        "code": null,
        "message": "",
        "output": {
            "task_id": "d35658e4-483f-453b-b8dc-xxxxxx",
            "task_status": "SUCCEEDED",
            "results": [{
                "url": "https://dashscope-result-wlcb.oss-cn-wulanchabu.aliyuncs.com/xxx.png",
                "orig_prompt": "A flower shop with exquisite windows, a beautiful wooden door, and flowers on display",
                "actual_prompt": "An exquisite flower shop, with elegant carvings on the windows and a beautiful wooden door with a brass handle. Inside, a variety of colorful flowers such as roses, tulips, and lilies are displayed. The background is a warm indoor scene with soft light, creating a peaceful and comfortable atmosphere. High-definition realistic photography, close-up center composition."
            }],
            "submit_time": "2025-01-08 19:36:01.521",
            "scheduled_time": "2025-01-08 19:36:01.542",
            "end_time": "2025-01-08 19:36:13.270",
            "task_metrics": {
                "TOTAL": 1,
                "SUCCEEDED": 1,
                "FAILED": 0
            }
        },
        "usage": {
            "image_count": 1
        }
    }
    ```
    

## DashScope Java SDK

The SDK parameter names align with the HTTP API, with structures adapted for Java.

Text-to-image tasks can take significant time. The SDK encapsulates the HTTP asynchronous call flow and supports both synchronous and asynchronous calls.

> Processing time depends on the task queue and service status.

### **wan2.6**

**Important**

-   The following code applies only to the **wan2.6-t2i** model.
    
-   Make sure that your DashScope Java SDK version is **2.22.6 or later** before you run the following code.
    

The `base_url` and API key are specific to each region and cannot be used interchangeably. The following examples show how to make a call in the Singapore region:

#### Singapore

`https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1`

When calling, replace `{WorkspaceId}` with your actual [workspace ID](/help/en/model-studio/obtain-the-app-id-and-workspace-id#d3eb3cd37b7fu).

#### US (Virginia)

`https://dashscope-us.aliyuncs.com/api/v1`

#### **China (Beijing)**

`https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api/v1`

When calling, replace `{WorkspaceId}` with your actual [workspace ID](/help/en/model-studio/obtain-the-app-id-and-workspace-id#d3eb3cd37b7fu).

#### Germany (Frankfurt)

`https://{WorkspaceId}.eu-central-1.maas.aliyuncs.com/api/v1`

Replace `{WorkspaceId}` with your actual [Workspace ID](/help/en/model-studio/obtain-the-app-id-and-workspace-id#d3eb3cd37b7fu).

> The global deployment scope (Frankfurt region) supports only asynchronous calls.

## **Synchronous call**

##### **Request example**

```
import com.alibaba.dashscope.aigc.imagegeneration.*;
import com.alibaba.dashscope.exception.ApiException;
import com.alibaba.dashscope.exception.NoApiKeyException;
import com.alibaba.dashscope.exception.UploadFileException;
import com.alibaba.dashscope.utils.Constants;
import com.alibaba.dashscope.utils.JsonUtils;
import java.util.Collections;

public class Main {

    static {
        // The following URL is for the Singapore region. When calling, replace {WorkspaceId} with your actual workspace ID. URLs vary by region.
        Constants.baseHttpApiUrl = "https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1";
    }

    // If you have not configured the environment variable, replace the following line with your Model Studio API key: apiKey="sk-xxx"
    // The API key is different for each region. To get an API key: https://www.alibabacloud.com/help/en/model-studio/get-api-key
    static String apiKey = System.getenv("DASHSCOPE_API_KEY");

    public static void basicCall() throws ApiException, NoApiKeyException, UploadFileException {
        ImageGenerationMessage message = ImageGenerationMessage.builder()
                .role("user")
                .content(Collections.singletonList(
                        Collections.singletonMap("text", "A flower shop with exquisite windows, a beautiful wooden door, and flowers on display")
                )).build();

        ImageGenerationParam param = ImageGenerationParam.builder()
                .apiKey(apiKey)
                .model("wan2.6-t2i")
                .n(1)
                .size("1280*1280")
                .negativePrompt("")
                .promptExtend(true)
                .watermark(false)
                .messages(Collections.singletonList(message))
                .build();

        ImageGeneration imageGeneration = new ImageGeneration();
        ImageGenerationResult result = null;
        try {
            System.out.println("---sync call, please wait a moment----");
            result = imageGeneration.call(param);
        } catch (ApiException | NoApiKeyException | UploadFileException e) {
            throw new RuntimeException(e.getMessage());
        }
        System.out.println(JsonUtils.toJson(result));
    }

    public static void main(String[] args) {
        try {
            basicCall();
        } catch (ApiException | NoApiKeyException | UploadFileException e) {
            System.out.println(e.getMessage());
        }
    }
}
```

##### Response example

> The URL is valid for 24 hours. You must download the image promptly.

```
{
    "status_code": 200,
    "request_id": "50b57166-eaaa-4f17-b1e0-35a5ca88672c",
    "code": "",
    "message": "",
    "output": {
        "choices": [
            {
                "finish_reason": "stop",
                "message": {
                    "role": "assistant",
                    "content": [
                        {
                            "image": "https://dashscope-result-sh.oss-cn-shanghai.aliyuncs.com/xxx.png?Expires=xxx",
                            "type": "image"
                        }
                    ]
                }
            }
        ],
        "finished": true
    },
    "usage": {
        "input_tokens": 0,
        "output_tokens": 0,
        "image_count": 1,
        "size": "1280*1280",
        "total_tokens": 0
    }
}
```

## **Asynchronous call**

##### **Request example**

```
import com.alibaba.dashscope.aigc.imagegeneration.*;
import com.alibaba.dashscope.exception.ApiException;
import com.alibaba.dashscope.exception.NoApiKeyException;
import com.alibaba.dashscope.exception.UploadFileException;
import com.alibaba.dashscope.utils.Constants;
import com.alibaba.dashscope.utils.JsonUtils;
import java.util.Collections;

public class Main {

    static {
        // The following URL is for the Singapore region. When calling, replace {WorkspaceId} with your actual workspace ID. URLs vary by region.
        Constants.baseHttpApiUrl = "https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1";
    }

    // If you have not configured the environment variable, replace the following line with your Model Studio API key: apiKey="sk-xxx"
    // The API key is different for each region. To get an API key: https://www.alibabacloud.com/help/en/model-studio/get-api-key
    static String apiKey = System.getenv("DASHSCOPE_API_KEY");

    public static void asyncCall() throws ApiException, NoApiKeyException, UploadFileException {
        ImageGenerationMessage message = ImageGenerationMessage.builder()
                .role("user")
                .content(Collections.singletonList(
                        Collections.singletonMap("text", "A flower shop with exquisite windows, a beautiful wooden door, and flowers on display")
                )).build();

        ImageGenerationParam param = ImageGenerationParam.builder()
                .apiKey(apiKey)
                .model("wan2.6-t2i")
                .n(1)
                .size("1280*1280")
                .negativePrompt("")
                .promptExtend(true)
                .watermark(false)
                .messages(Collections.singletonList(message))
                .build();

        ImageGeneration imageGeneration = new ImageGeneration();
        ImageGenerationResult result = null;
        try {
            System.out.println("---async call, creating task----");
            result = imageGeneration.asyncCall(param);
        } catch (ApiException | NoApiKeyException | UploadFileException e) {
            throw new RuntimeException(e.getMessage());
        }
        System.out.println(JsonUtils.toJson(result));

        String taskId = result.getOutput().getTaskId();
        // Wait for the task to complete
        waitTask(taskId);
    }

    public static void waitTask(String taskId) throws ApiException, NoApiKeyException {
        ImageGeneration imageGeneration = new ImageGeneration();
        ImageGenerationResult result = imageGeneration.wait(taskId, apiKey);
        System.out.println(JsonUtils.toJson(result));
    }

    public static void main(String[] args) {
        try {
            asyncCall();
        } catch (ApiException | NoApiKeyException | UploadFileException e) {
            System.out.println(e.getMessage());
        }
    }
}
```

##### Response examples

1.  Example response for creating a task
    
    ```
    {
        "status_code": 200,
        "request_id": "9cd85950-2e26-4b2c-b562-1694cf9288e5",
        "code": "",
        "message": "",
        "output": {
            "task_id": "4c861fbe-af89-4a2f-8fc5-4bb15c3139ba",
            "task_status": "PENDING"
        },
        "usage": null
    }
    ```
    

1.  Example response for querying the task result
    
    > The URL is valid for 24 hours. You must download the image promptly.
    
    ```
    {
        "status_code": 200,
        "request_id": "cbdf1424-306e-4a52-82f3-8bf5d8a99103",
        "code": "",
        "message": "",
        "output": {
            "choices": [
                {
                    "finish_reason": "stop",
                    "message": {
                        "role": "assistant",
                        "content": [
                            {
                                "image": "https://dashscope-result-sh.oss-cn-shanghai.aliyuncs.com/xxx.png?Expires=xxx",
                                "type": "image"
                            }
                        ]
                    }
                }
            ],
            "task_id": "4c861fbe-af89-4a2f-8fc5-4bb15c3139ba",
            "task_status": "SUCCEEDED",
            "submit_time": "2026-01-16 16:36:06.556",
            "scheduled_time": "2026-01-16 16:36:06.591",
            "end_time": "2026-01-16 16:36:25.190",
            "finished": true
        },
        "usage": {
            "input_tokens": 0,
            "output_tokens": 0,
            "size": "1280*1280",
            "total_tokens": 0,
            "image_count": 1
        }
    }
    ```
    

### wan2.5 and earlier models

**Important**

-   The following code applies only to wan2.5 and earlier models.
    
-   Make sure that your DashScope Java SDK version is **2.22.2 or later** before you run the following code.
    
    If your version is too old, errors such as "url error, please check url!" may occur. See [Install the SDK](/help/en/model-studio/install-sdk) to update.
    

The `base_url` and API key are specific to each region and cannot be used interchangeably. The following examples show how to make a call in the Singapore region:

#### Singapore

`https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1`

When calling, replace `{WorkspaceId}` with your actual [workspace ID](/help/en/model-studio/obtain-the-app-id-and-workspace-id#d3eb3cd37b7fu).

#### China (Beijing)

`https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api/v1`

When calling, replace `{WorkspaceId}` with your actual [workspace ID](/help/en/model-studio/obtain-the-app-id-and-workspace-id#d3eb3cd37b7fu).

## **Synchronous call**

##### Request example

```
// Copyright (c) Alibaba, Inc. and its affiliates.

import com.alibaba.dashscope.aigc.imagesynthesis.ImageSynthesis;
import com.alibaba.dashscope.aigc.imagesynthesis.ImageSynthesisListResult;
import com.alibaba.dashscope.aigc.imagesynthesis.ImageSynthesisParam;
import com.alibaba.dashscope.aigc.imagesynthesis.ImageSynthesisResult;
import com.alibaba.dashscope.task.AsyncTaskListParam;
import com.alibaba.dashscope.exception.ApiException;
import com.alibaba.dashscope.exception.NoApiKeyException;
import com.alibaba.dashscope.utils.Constants;
import com.alibaba.dashscope.utils.JsonUtils;

import java.util.HashMap;
import java.util.Map;

public class Main {

  static {
     // The following URL is for the Singapore region. When calling, replace {WorkspaceId} with your actual workspace ID. URLs vary by region.
     Constants.baseHttpApiUrl = "https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1";  
  }
  
  // If you have not configured the environment variable, replace the following line with your Model Studio API key: apiKey="sk-xxx"
  // The API keys for the Singapore and Beijing regions are different. To get an API key: https://www.alibabacloud.com/help/en/model-studio/get-api-key
  static String apiKey = System.getenv("DASHSCOPE_API_KEY");
  
  public static void basicCall() throws ApiException, NoApiKeyException {
        // Set the parameters
        Map<String, Object> parameters = new HashMap<>();
        parameters.put("prompt_extend", true);
        parameters.put("watermark", false);
        parameters.put("seed", 12345);

        ImageSynthesisParam param =
                ImageSynthesisParam.builder()
                        .apiKey(apiKey)
                        .model("wan2.5-t2i-preview")
                        .prompt("A flower shop with exquisite windows, a beautiful wooden door, and flowers on display")
                        .n(1)
                        .size("1280*1280")
                        .negativePrompt("")
                        .parameters(parameters)
                        .build();

        ImageSynthesis imageSynthesis = new ImageSynthesis();
        ImageSynthesisResult result = null;
        try {
            System.out.println("---sync call, please wait a moment----");
            result = imageSynthesis.call(param);
        } catch (ApiException | NoApiKeyException e){
            throw new RuntimeException(e.getMessage());
        }
        System.out.println(JsonUtils.toJson(result));
    }

    public static void listTask() throws ApiException, NoApiKeyException {
        ImageSynthesis is = new ImageSynthesis();
        AsyncTaskListParam param = AsyncTaskListParam.builder().build();
        param.setApiKey(apiKey);
        ImageSynthesisListResult result = is.list(param);
        System.out.println(result);
    }

    public static void fetchTask(String taskId) throws ApiException, NoApiKeyException {
        ImageSynthesis is = new ImageSynthesis();
        // If the DASHSCOPE_API_KEY environment variable is set, you can set apiKey to null.
        ImageSynthesisResult result = is.fetch(taskId, apiKey);
        System.out.println(result.getOutput());
        System.out.println(result.getUsage());
    }

    public static void main(String[] args){
        try{
            basicCall();
            //listTask();
        }catch(ApiException|NoApiKeyException e){
            System.out.println(e.getMessage());
        }
    }
}
```

##### Response example

> The URL is valid for 24 hours. You must download the image promptly.

```
{
    "request_id": "22f9c744-206c-9a78-899a-xxxxxx",
    "output": {
        "task_id": "4a0f8fc6-03fb-4c44-a13a-xxxxxx",
        "task_status": "SUCCEEDED",
        "results": [{
           "orig_prompt": "A flower shop with exquisite windows, a beautiful wooden door, and flowers on display",
            "actual_prompt": "A flower shop with exquisitely carved windows and a beautiful dark wooden door slightly ajar. A variety of fresh flowers, including roses, lilies, and sunflowers, are on display inside, vibrant in color and fragrant. The background is a cozy indoor scene with soft light streaming through the windows onto the flowers. High-definition realistic photography, medium shot composition.",
            "url": "https://dashscope-result-wlcb.oss-cn-wulanchabu.aliyuncs.com/1.png"
        }],
        "task_metrics": {
            "TOTAL": 1,
            "SUCCEEDED": 1,
            "FAILED": 0
        }
    },
    "usage": {
        "image_count": 1
    }
}
```

## **Asynchronous call**

##### Request example

```
// Copyright (c) Alibaba, Inc. and its affiliates.

import com.alibaba.dashscope.aigc.imagesynthesis.ImageSynthesis;
import com.alibaba.dashscope.aigc.imagesynthesis.ImageSynthesisParam;
import com.alibaba.dashscope.aigc.imagesynthesis.ImageSynthesisResult;
import com.alibaba.dashscope.exception.ApiException;
import com.alibaba.dashscope.exception.NoApiKeyException;
import com.alibaba.dashscope.utils.Constants;
import com.alibaba.dashscope.utils.JsonUtils;

import java.util.HashMap;
import java.util.Map;

public class Main {
    static {
        // The following URL is for the Singapore region. When calling, replace {WorkspaceId} with your actual workspace ID. URLs vary by region.
        Constants.baseHttpApiUrl = "https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1";
    }
    
    // If you have not configured the environment variable, replace the following line with your Model Studio API key: apiKey="sk-xxx"
    // The API keys for the Singapore and Beijing regions are different. To get an API key: https://www.alibabacloud.com/help/en/model-studio/get-api-key
    static String apiKey = System.getenv("DASHSCOPE_API_KEY");
    
    public void asyncCall() {
        System.out.println("---create task----");
        String taskId = this.createAsyncTask();
        System.out.println("---wait task done then return image url----");
        this.waitAsyncTask(taskId);
    }

    /**
     * Create an asynchronous task
     * @return taskId
     */
    public String createAsyncTask() {
        // Set the parameters
        Map<String, Object> parameters = new HashMap<>();
        parameters.put("prompt_extend", true);
        parameters.put("watermark", false);
        parameters.put("seed", 12345);

        ImageSynthesisParam param =
                ImageSynthesisParam.builder()
                        .apiKey(apiKey)
                        .model("wan2.5-t2i-preview")
                        .prompt("A flower shop with exquisite windows, a beautiful wooden door, and flowers on display")
                        .n(1)
                        .size("1280*1280)
                        .negativePrompt("")
                        .parameters(parameters)
                        .build();

        ImageSynthesis imageSynthesis = new ImageSynthesis();
        ImageSynthesisResult result = null;
        try {
            result = imageSynthesis.asyncCall(param);
        } catch (Exception e){
            throw new RuntimeException(e.getMessage());
        }
        System.out.println(JsonUtils.toJson(result));
        String taskId = result.getOutput().getTaskId();
        System.out.println("taskId=" + taskId);
        return taskId;
    }

    /**
     * Wait for the asynchronous task to finish
     * @param taskId The task ID
     * */
    public void waitAsyncTask(String taskId) {
        ImageSynthesis imageSynthesis = new ImageSynthesis();
        ImageSynthesisResult result = null;
        try {
            // After configuring the environment variable, you can set apiKey to null here
            result = imageSynthesis.wait(taskId, apiKey);
        } catch (ApiException | NoApiKeyException e){
            throw new RuntimeException(e.getMessage());
        }
        System.out.println(JsonUtils.toJson(result));
        System.out.println(JsonUtils.toJson(result.getOutput()));
    }

    public static void main(String[] args){
        Main main = new Main();
        main.asyncCall();
    }

}
```

##### Response examples

1.  Example response for creating a task
    
    ```
    {
    	"request_id": "5dbf9dc5-4f4c-9605-85ea-542f97709ba8",
    	"output": {
    		"task_id": "7277e20e-aa01-4709-xxxxxxxx",
    		"task_status": "PENDING"
    	}
    }
    ```
    
2.  Example response for querying the task result
    
    ```
    {
        "request_id": "22f9c744-206c-9a78-899a-xxxxxx",
        "output": {
            "task_id": "4a0f8fc6-03fb-4c44-a13a-xxxxxx",
            "task_status": "SUCCEEDED",
            "results": [{
               "orig_prompt": "A flower shop with exquisite windows, a beautiful wooden door, and flowers on display",
                "actual_prompt": "A flower shop with exquisitely carved windows and a beautiful dark wooden door slightly ajar. A variety of fresh flowers, including roses, lilies, and sunflowers, are on display inside, vibrant in color and fragrant. The background is a cozy indoor scene with soft light streaming through the windows onto the flowers. High-definition realistic photography, medium shot composition.",
                "url": "https://dashscope-result-wlcb.oss-cn-wulanchabu.aliyuncs.com/1.png"
            }],
            "task_metrics": {
                "TOTAL": 1,
                "SUCCEEDED": 1,
                "FAILED": 0
            }
        },
        "usage": {
            "image_count": 1
        }
    }
    ```
    

## **Limitations**

-   **Data validity**: The task `task_id` and image `url` are retained for only 24 hours. After this period, they cannot be queried or downloaded.
    
-   **Content moderation**: Both the input `prompt` and output image undergo content moderation. Non-compliant content returns an `IPInfringementSuspect` or `DataInspectionFailed` error. See [Error codes](/help/en/model-studio/error-code).
    

## **Billing and rate limiting**

-   Check free quotas and pricing in the console.
    
-   For model rate limiting, see [Wan series](/help/en/model-studio/rate-limit#513e0a3df24v7).
    
-   Billing is based on the **number of images** successfully generated. Failed calls do not incur fees and do not consume the [new user free quota](/help/en/model-studio/new-free-quota).
    

## **Error codes**

If the model call fails and returns an error message, see [Error codes](/help/en/model-studio/error-code) for resolution.

## **FAQ**

**Q: How do I view a model's inference costs and call volume?**

A: See [Bill inquiry and cost management](/help/en/model-studio/bill-query-and-cost-management).

/\* Adjust table width \*/ .aliyun-docs-content table.medium-width { max-width: 1018px; width: 100%; } .aliyun-docs-content table.table-no-border tr td:first-child { padding-left: 0; } .aliyun-docs-content table.table-no-border tr td:last-child { padding-right: 0; } /\* Support sticky positioning \*/ div:has(.aliyun-docs-content), .aliyun-docs-content .markdown-body { overflow: visible; } .stick-top { position: sticky; top: 46px; } /\*\* Code block font \*\*/ /\* Reduce code block margin in tables to make table information more compact \*/ .unionContainer .markdown-body table .help-code-block { margin: 0 !important; } /\* Reduce code block font size in tables to make table information more compact \*/ .unionContainer .markdown-body .help-code-block pre { font-size: 12px !important; } /\* Reduce code block font size in tables to make table information more compact \*/ .unionContainer .markdown-body .help-code-block pre code { font-size: 12px !important; } /\*\* API Reference tables \*\*/ .aliyun-docs-content table.api-reference tr td:first-child { margin: 0px; border-bottom: 1px solid #d8d8d8; } .aliyun-docs-content table.api-reference tr:last-child td:first-child { border-bottom: none; } .aliyun-docs-content table.api-reference p { color: #6e6e80; } .aliyun-docs-content table.api-reference b, i { color: #181818; } .aliyun-docs-content table.api-reference .collapse { border: none; margin-top: 4px; margin-bottom: 4px; } .aliyun-docs-content table.api-reference .collapse .expandable-title-bold { padding: 0; } .aliyun-docs-content table.api-reference .collapse .expandable-title { padding: 0; } .aliyun-docs-content table.api-reference .collapse .expandable-title-bold .title { margin-left: 16px; } .aliyun-docs-content table.api-reference .collapse .expandable-title .title { margin-left: 16px; } .aliyun-docs-content table.api-reference .collapse .expandable-title-bold i.icon { position: absolute; color: #777; font-weight: 100; } .aliyun-docs-content table.api-reference .collapse .expandable-title i.icon { position: absolute; color: #777; font-weight: 100; } .aliyun-docs-content table.api-reference .collapse.expanded .expandable-content { padding: 10px 14px 10px 14px !important; margin: 0; border: 1px solid #e9e9e9; } .aliyun-docs-content table.api-reference .collapse .expandable-title-bold b { font-size: 13px; font-weight: normal; color: #6e6e80; } .aliyun-docs-content table.api-reference .collapse .expandable-title b { font-size: 13px; font-weight: normal; color: #6e6e80; } .aliyun-docs-content table.api-reference .tabbed-content-box { border: none; } .aliyun-docs-content table.api-reference .tabbed-content-box section { padding: 8px 0 !important; } .aliyun-docs-content table.api-reference .tabbed-content-box.mini .tab-box { /\* position: absolute; left: 40px; right: 0; \*/ } .aliyun-docs-content .margin-top-33 { margin-top: 33px !important; } .aliyun-docs-content .two-codeblocks pre { max-height: calc(50vh - 136px) !important; height: auto; } .expandable-content section { border-bottom: 1px solid #e9e9e9; padding-top: 6px; padding-bottom: 4px; } .expandable-content section:last-child { border-bottom: none; } .expandable-content section:first-child { padding-top: 0; }

/\* Displays tables as cards, similar to those in DingTalk documents. \*/ table.help-table-card td { border: 10px solid #FFF !important; background: #F4F6F9; padding: 16px !important; vertical-align: top; } /\* Reduces the margin of code blocks in tables for a more compact display. \*/ .unionContainer .markdown-body table .help-code-block { margin: 0 !important; } /\* Reduces the font size of code blocks in tables for a more compact display. \*/ .unionContainer .markdown-body .help-code-block pre { font-size: 12px !important; } /\* Reduces the font size of code blocks in tables for a more compact display. \*/ .unionContainer .markdown-body .help-code-block pre code { font-size: 12px !important; } /\* Reduces the vertical margin of blockquotes in tables to prevent sparse content. \*/ .unionContainer .markdown-body table blockquote { margin: 4px 0 0 0; }

Wan2.7-Image supports text-to-image, text-to-image-set, image-to-image-set, image editing, and multi-image reference generation.

## Model overview

| **Model** | **Description** | **Output image specifications** |
| --- | --- | --- |
| wan2.7-image-pro | Wan 2.7 image Pro. Supports 4K output for text-to-image generation (not for image sets). | Image format: PNG. For image resolution and dimensions, see the [size parameter](/help/en/model-studio/wan-image-generation-api-reference#wan27-param-size-section). |
| wan2.7-image | Wan 2.7 image. Faster generation. |

**Note**

Before you call a model, check [Model list and prices](/help/en/model-studio/model-pricing#e2540d71a2utl) for regional model availability.

## Prerequisites

[Obtain an API key](/help/en/model-studio/get-api-key) and [export the API key as an environment variable](/help/en/model-studio/configure-api-key-through-environment-variables).

**Important**

The China (Beijing) and Singapore regions have separate **API keys** and **request endpoints**. They cannot be used interchangeably. Cross-region calls lead to authentication failures or service errors.

## **HTTP synchronous**

Returns the result in a single request. Recommended for most use cases.

## **Singapore**

`POST https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation`

Replace `{WorkspaceId}` with your actual [workspace ID](/help/en/model-studio/obtain-the-app-id-and-workspace-id#d3eb3cd37b7fu).

## **Beijing**

`POST https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation`

Replace `{WorkspaceId}` with your actual [workspace ID](/help/en/model-studio/obtain-the-app-id-and-workspace-id#d3eb3cd37b7fu).

| #### Request parameters | ## Text-to-image > The wan2.7-image-pro model supports 4K resolution for text-to-image generation only. Image editing and image set generation support up to 2K resolution. ``` curl --location 'https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation' \\ --header 'Content-Type: application/json' \\ --header "Authorization: Bearer $DASHSCOPE_API_KEY" \\ --data '{ "model": "wan2.7-image-pro", "input": { "messages": [ { "role": "user", "content": [ {"text": "A flower shop with exquisite windows, a beautiful wooden door, and flowers on display"} ] } ] }, "parameters": { "size": "2K", "n": 1, "watermark": false, "thinking_mode": true } }' ``` ## **Image editing** ``` curl --location 'https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation' \\ --header 'Content-Type: application/json' \\ --header "Authorization: Bearer $DASHSCOPE_API_KEY" \\ --data '{ "model": "wan2.7-image-pro", "input": { "messages": [ { "role": "user", "content": [ {"image": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20251229/pjeqdf/car.webp"}, {"image": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20251229/xsunlm/paint.webp"}, {"text": "Spray-paint the graffiti from image 2 onto the car in image 1"} ] } ] }, "parameters": { "size": "2K", "n": 1, "watermark": false } }' ``` ## **Interactive editing** ``` curl --location 'https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation' \\ --header 'Content-Type: application/json' \\ --header "Authorization: Bearer $DASHSCOPE_API_KEY" \\ --data '{ "model": "wan2.7-image-pro", "input": { "messages": [ { "role": "user", "content": [ {"image": "https://img.alicdn.com/imgextra/i3/O1CN0157XGE51l6iL9441yX_!!6000000004770-49-tps-1104-1472.webp"}, {"image": "https://img.alicdn.com/imgextra/i3/O1CN01SfG4J41UYn9WNt4X1_!!6000000002530-49-tps-1696-960.webp"}, {"text": "Place the alarm clock from image 1 into the bounding box of image 2, and blend the scene and lighting naturally."} ] } ] }, "parameters": { "bbox_list": [[],[[989, 515, 1138, 681]]], "size": "2K", "n": 1, "watermark": false } }' ``` ## **Image set generation** ``` curl --location 'https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation' \\ --header 'Content-Type: application/json' \\ --header "Authorization: Bearer $DASHSCOPE_API_KEY" \\ --data '{ "model": "wan2.7-image-pro", "input": { "messages": [ { "role": "user", "content": [ {"text": "A cinematic group of images documenting the same stray ginger cat. The features must be consistent throughout. First image: In spring, the ginger cat weaves through blooming cherry blossom trees. Second image: In summer, the ginger cat cools off in the shade on an old street. Third image: In autumn, the ginger cat steps on a ground covered with golden fallen leaves. Fourth image: In winter, the ginger cat walks on the snow, leaving footprints."} ] } ] }, "parameters": { "enable_sequential": true, "n": 4, "size": "2K" } }' ``` |
| --- | --- |
| ##### Headers |
| **Content-Type** `*string*` **(Required)** The content type of the request. Must be `application/json`. |
| **Authorization** `*string*` **(Required)** Authenticates the request with a Model Studio API key. Example: Bearer sk-xxxx. |
| ##### Request body |
| **model** `*string*` **(Required)** The model name. Valid values: `wan2.7-image-pro`, `wan2.7-image`. |
| **input** `*object*` **(Required)** The input object. **Properties** **messages** `*array*` **(Required)** An array of request content. Only single-turn conversations are supported. **Properties** **role** `*string*` **(Required)** The message role. Must be `user`. **content** `*array*` **(Required)** An array of message content. **Properties** **text** `*string*` The text prompt. Supports Chinese and English. Maximum 5,000 characters. Each character, letter, number, or symbol counts as one. Excess characters are truncated. **image** `*string*` The URL or Base64-encoded string of the input image. Image limits: - Image format: JPEG, JPG, PNG (alpha channels are not supported), BMP, WEBP. - Image resolution: The width and height must be between 240 and 8,000 pixels. The aspect ratio must be between 1:8 and 8:1. - File size: No more than 20 MB. Image number limits: - You can input 0 to 9 images. - When you input multiple images, you must pass multiple `image` objects in the `content` array. The order of the objects in the array determines the order of the images. Supported input formats: 1. Use a publicly accessible URL - Supports HTTP or HTTPS protocols. - Example: `http://wanx.alicdn.com/material/xxx.jpeg`. 2. Pass a Base64-encoded image string - Format: data:{MIME\\_type};base64,{base64\\_data} - Example: data:image/jpeg;base64,GDU7MtCZzEbTbmRZ... (This is for illustration only. You must pass the complete string.) - For more information, see [Image input methods](/help/en/model-studio/wan-image-edit#8db0e2215frua). |
| **parameters** `*object*` (Optional) Model parameter settings. **Properties** **bbox\\_list** `*List[List[List[int]]]*` (Optional) The bounding box area for interactive editing. - The length of the list must match the number of input images. If an image does not require editing, pass an empty list `[]` in the corresponding position. - Coordinate format: `[x1, y1, x2, y2]` (top-left x, top-left y, bottom-right x, bottom-right y). Use absolute pixel coordinates of the original image. The top-left coordinate is (0, 0). - A single image supports a maximum of two bounding boxes. Example: Input 3 images, where the second image has no bounding box and the first image has two bounding boxes: ``` [ [[0, 0, 12, 12], [25, 25, 100, 100]], # Image 1 (2 boxes) [], # Image 2 (no box) [[10, 10, 50, 50]] # Image 3 (1 box) ] ``` **enable\\_sequential** `*boolean*` (Optional) Controls the image generation mode: - false (default): The default output mode. - true: The image set output mode. **size** `*string*` (Optional) The output image resolution. Supports two mutually exclusive methods: **Model: wan2.7-image-pro** - **Method 1: Specify the output image resolution (Recommended)** - Supports 1K, 2K (default), and 4K specifications. - **Scope of application**: - Text-to-image (no image input, not for image set generation): Supports 1K, 2K, and 4K. - Other scenarios: Supports 1K and 2K. - **Total pixels for each specification**: 1K: 1024×1024, 2K: 2048×2048, 4K: 4096×4096 - **Image aspect ratio**: - When an image is input: The output aspect ratio matches the input image (the last one if multiple images are input) and is scaled to the selected resolution. - When no image is input: The output is a square image. - **Method 2: Specify the width and height in pixels for the generated image** - Text-to-image: Total pixels are between 768×768 and 4096×4096. The aspect ratio is between 1:8 and 8:1. - Other scenarios: Total pixels are between 768×768 and 2048×2048. The aspect ratio is between 1:8 and 8:1. **Model: wan2.7-image** - **Method 1: Specify the output image resolution (Recommended)** - Supports 1K and 2K (default) specifications. 4K is not supported. - **Method 2: Specify the width and height in pixels for the generated image** - In all scenarios, the total pixels are between 768×768 and 2048×2048. The aspect ratio is between 1:8 and 8:1. > The pixel values of the output image may have minor differences from the specified values. **n** `*int*` (Optional) **Important** The n parameter directly affects cost: unit price × number of successfully generated images. Confirm the [model pricing](/help/en/model-studio/model-pricing#e2540d71a2utl) before calling. - When image set mode is disabled, this value represents the number of images to generate. The range is 1 to 4. Defaults to 1. - When image set mode is enabled, this value represents the maximum number of images to generate. The range is 1 to 12. Defaults to 12. The actual number is determined by the model and will not exceed n. **thinking\\_mode** `*boolean*` (Optional) Enables thinking mode. Defaults to `true`. This parameter is effective only when image set mode is disabled and no image is input. When enabled, the model enhances its inference capabilities to improve output quality, but this increases generation time. **color\\_palette** `*array*` (Optional) A custom color theme. An array of objects, each with a hexadecimal color and a ratio. Must include 3 to 10 colors. 8 colors recommended. This is available only when image set mode is disabled (`enable_sequential=false`). **Properties** **hex** `*string*` **(Required)** The color value in hexadecimal (HEX) format. **ratio** `*string*` **(Required)** The percentage of the color. Must be accurate to two decimal places (such as `"25.00%"`). The sum of all ratio values must be 100.00%. **Click to view an input example** ``` "color_palette": [ { "hex": "#C2D1E6", "ratio": "23.51%" }, { "hex": "#CDD8E9", "ratio": "20.13%" }, { "hex": "#B5C8DB", "ratio": "15.88%" }, { "hex": "#C0B5B4", "ratio": "13.27%" }, { "hex": "#DAE0EC", "ratio": "10.11%" }, { "hex": "#636574", "ratio": "8.93%" }, { "hex": "#CACAD2", "ratio": "5.55%" }, { "hex": "#CBD4E4", "ratio": "2.62%" } ] ``` **watermark** `*bool*` (Optional) Adds a watermark label in the bottom-right corner of the image with fixed text "AI Generated". - false (default) - true **seed** `*integer*` (optional) Random number seed. Valid range: `[0,2147483647]`. Using the same `seed` yields similar outputs. If omitted, the algorithm uses a random seed. **Note:** Image generation is probabilistic. Even with the same `seed`, results may vary. |

| #### Response parameters | ## Successful task execution Task data (task status and image URLs) is retained for only 24 hours and then automatically purged. Save generated images promptly. ``` { "output": { "choices": [ { "finish_reason": "stop", "message": { "content": [ { "image": "https://dashscope-xxx.oss-xxx.aliyuncs.com/xxx.png?Expires=xxx", "type": "image" } ], "role": "assistant" } } ], "finished": true }, "usage": { "image_count": 1, "input_tokens": 10867, "output_tokens": 2, "size": "1488*704", "total_tokens": 10869 }, "request_id": "71dfc3c6-f796-9972-97e4-bc4efc4faxxx" } ``` ## Abnormal task execution If a task fails, the `code` and `message` fields in the response indicate the error cause. See [Error codes](/help/en/model-studio/error-code). ``` { "request_id": "a4d78a5f-655f-9639-8437-xxxxxx", "code": "InvalidParameter", "message": "num_images_per_prompt must be 1" } ``` |
| --- | --- |
| **output** `*object*` Task output information. **Properties** **choices** `*array*` The output content generated by the model. **Properties** **finish\\_reason** `*string*` The reason the task stopped. `stop` indicates natural completion. **message** `*object*` The message returned by the model. **Properties** **role** `*string*` The message role. Always `assistant`. **content** `*array*` **Properties** **type** `*string*` Value: image. **image** `*string*` The URL of the generated image. Format: PNG. **The link is valid for 24 hours**. Download the image promptly. **finished** `*boolean*` Indicates whether the task is finished. Default: false. |
| **usage** `*object*` Usage statistics for the request. Only successful results are counted. **Properties** **image\\_count** `*integer*` The number of generated images. **size** `*string*` The resolution of the generated image. Example: 1376\\*768. **input\\_tokens** `*integer*` The number of input tokens (not billed). Billing is based on the number of images. **output\\_tokens** `*integer*` The number of output tokens (not billed). Billing is based on the number of images. **total\\_tokens** `*integer*` The total number of tokens (not billed). Billing is based on the number of images. |
| **request\\_id** `*string*` Unique request identifier for tracing and troubleshooting. |
| **code** `*string*` Error code. Returned only for failed requests. See [Error codes](/help/en/model-studio/error-code). |     |
| **message** `*string*` Detailed error message. Returned only for failed requests. See [Error codes](/help/en/model-studio/error-code). |     |

## **HTTP asynchronous**

Best for long-running tasks. Submit a task, then poll for status and results.

### Step 1: Create a task to get the task ID

## **Singapore**

`POST https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/services/aigc/image-generation/generation`

Replace `{WorkspaceId}` with your actual [workspace ID](/help/en/model-studio/obtain-the-app-id-and-workspace-id#d3eb3cd37b7fu).

## **Beijing**

`POST https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api/v1/services/aigc/image-generation/generation`

Replace `{WorkspaceId}` with your actual [workspace ID](/help/en/model-studio/obtain-the-app-id-and-workspace-id#d3eb3cd37b7fu).

| #### Request parameters | ## **Text-to-image** > The wan2.7-image-pro model supports 4K resolution for text-to-image generation only. Image editing and image set generation support up to 2K resolution. ``` curl --location 'https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/services/aigc/image-generation/generation' \\ --header 'Content-Type: application/json' \\ --header "Authorization: Bearer $DASHSCOPE_API_KEY" \\ --header "X-DashScope-Async: enable" \\ --data '{ "model": "wan2.7-image-pro", "input": { "messages": [ { "role": "user", "content": [ {"text": "A flower shop with exquisite windows, a beautiful wooden door, and flowers on display"} ] } ] }, "parameters": { "size": "2K", "n": 1, "watermark": false, "thinking_mode": true } }' ``` ## **Image editing** ``` curl --location 'https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/services/aigc/image-generation/generation' \\ --header 'Content-Type: application/json' \\ --header "Authorization: Bearer $DASHSCOPE_API_KEY" \\ --header "X-DashScope-Async: enable" \\ --data '{ "model": "wan2.7-image-pro", "input": { "messages": [ { "role": "user", "content": [ {"image": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20251229/pjeqdf/car.webp"}, {"image": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20251229/xsunlm/paint.webp"}, {"text": "Spray-paint the graffiti from image 2 onto the car in image 1"} ] } ] }, "parameters": { "size": "2K", "n": 1, "watermark": false } }' ``` ## **Interactive editing** ``` curl --location 'https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/services/aigc/image-generation/generation' \\ --header 'Content-Type: application/json' \\ --header "Authorization: Bearer $DASHSCOPE_API_KEY" \\ --header "X-DashScope-Async: enable" \\ --data '{ "model": "wan2.7-image-pro", "input": { "messages": [ { "role": "user", "content": [ {"image": "https://img.alicdn.com/imgextra/i3/O1CN0157XGE51l6iL9441yX_!!6000000004770-49-tps-1104-1472.webp"}, {"image": "https://img.alicdn.com/imgextra/i3/O1CN01SfG4J41UYn9WNt4X1_!!6000000002530-49-tps-1696-960.webp"}, {"text": "Place the alarm clock from image 1 into the selected area of image 2, and blend the scene and lighting naturally."} ] } ] }, "parameters": { "bbox_list": [[],[[989, 515, 1138, 681]]], "size": "2K", "n": 1, "watermark": false } }' ``` ## **Image set generation** > The wan2.7-image-pro model supports up to 2K resolution for image set generation. ``` curl --location 'https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/services/aigc/image-generation/generation' \\ --header 'Content-Type: application/json' \\ --header "Authorization: Bearer $DASHSCOPE_API_KEY" \\ --header "X-DashScope-Async: enable" \\ --data '{ "model": "wan2.7-image-pro", "input": { "messages": [ { "role": "user", "content": [ {"text": "A cinematic photo set featuring the same stray orange cat, whose features must remain consistent across all images. First image: In spring, the cat weaves through blooming cherry blossom trees. Second image: In summer, the cat cools off in the shade on an old street. Third image: In autumn, the cat steps on a ground covered in golden fallen leaves. Fourth image: In winter, the cat walks on the snow, leaving footprints."} ] } ] }, "parameters": { "enable_sequential": true, "n": 4, "size": "2K" } }' ``` |
| --- | --- |
| ##### Headers |
| **Content-Type** `*string*` **(Required)** The content type of the request. Must be `application/json`. |
| **Authorization** `*string*` **(Required)** Authenticates the request with a Model Studio API key. Example: Bearer sk-xxxx. |
| **X-DashScope-Async** `*string*` **(Required)** Enables asynchronous processing. HTTP requests support only asynchronous calls. Must be `enable`. **Important** If this request header is missing, the error "current user api does not support synchronous calls" is returned. |
| ##### Request body |
| **model** `*string*` **(Required)** The model name. Valid values: `wan2.7-image-pro`, `wan2.7-image`. |
| **input** `*object*` **(Required)** The input object. **Properties** **messages** `*array*` **(Required)** An array of request content. Only single-turn conversations are supported. **Properties** **role** `*string*` **(Required)** The message role. Must be `user`. **content** `*array*` **(Required)** An array of message content. **Properties** **text** `*string*` The text prompt. Supports Chinese and English. Maximum 5,000 characters. Each character, letter, number, or symbol counts as one. Excess characters are truncated. **image** `*string*` The URL or Base64-encoded string of the input image. Image limits: - Image format: JPEG, JPG, PNG (alpha channels are not supported), BMP, WEBP. - Image resolution: The width and height must be between 240 and 8,000 pixels. The aspect ratio must be between 1:8 and 8:1. - File size: No more than 20 MB. Image number limits: - You can input 0 to 9 images. - When you input multiple images, you must pass multiple `image` objects in the `content` array. The order of the objects in the array determines the order of the images. Supported input formats: 1. Use a publicly accessible URL - Supports HTTP or HTTPS protocols. - Example: `http://wanx.alicdn.com/material/xxx.jpeg`. 2. Pass a Base64-encoded image string - Format: data:{MIME\\_type};base64,{base64\\_data} - Example: data:image/jpeg;base64,GDU7MtCZzEbTbmRZ... (This is for illustration only. You must pass the complete string.) - For more information, see [Image input methods](/help/en/model-studio/wan-image-edit#8db0e2215frua). |
| **parameters** `*object*` (Optional) Model parameter settings. **Properties** **bbox\\_list** `*List[List[List[int]]]*` (Optional) The bounding box area for interactive editing. - The length of the list must match the number of input images. If an image does not require editing, pass an empty list `[]` in the corresponding position. - Coordinate format: `[x1, y1, x2, y2]` (top-left x, top-left y, bottom-right x, bottom-right y). Use absolute pixel coordinates of the original image. The top-left coordinate is (0, 0). - A single image supports a maximum of two bounding boxes. Example: Input 3 images, where the second image has no bounding box and the first image has two bounding boxes: ``` [ [[0, 0, 12, 12], [25, 25, 100, 100]], # Image 1 (2 boxes) [], # Image 2 (no box) [[10, 10, 50, 50]] # Image 3 (1 box) ] ``` **enable\\_sequential** `*boolean*` (Optional) Controls the image generation mode: - false (default): The default output mode. - true: The image set output mode. **size** `*string*` (Optional) The output image resolution. Supports two mutually exclusive methods: **Model: wan2.7-image-pro** - **Method 1: Specify the output image resolution (Recommended)** - Supports 1K, 2K (default), and 4K specifications. - **Scope of application**: - Text-to-image (no image input, not for image set generation): Supports 1K, 2K, and 4K. - Other scenarios: Supports 1K and 2K. - **Total pixels for each specification**: 1K: 1024×1024, 2K: 2048×2048, 4K: 4096×4096 - **Image aspect ratio**: - When an image is input: The output aspect ratio matches the input image (the last one if multiple images are input) and is scaled to the selected resolution. - When no image is input: The output is a square image. - **Method 2: Specify the width and height in pixels for the generated image** - Text-to-image: Total pixels are between 768×768 and 4096×4096. The aspect ratio is between 1:8 and 8:1. - Other scenarios: Total pixels are between 768×768 and 2048×2048. The aspect ratio is between 1:8 and 8:1. **Model: wan2.7-image** - **Method 1: Specify the output image resolution (Recommended)** - Supports 1K and 2K (default) specifications. 4K is not supported. - **Method 2: Specify the width and height in pixels for the generated image** - In all scenarios, the total pixels are between 768×768 and 2048×2048. The aspect ratio is between 1:8 and 8:1. > The pixel values of the output image may have minor differences from the specified values. **n** `*int*` (Optional) **Important** The n parameter directly affects cost: unit price × number of successfully generated images. Confirm the [model pricing](/help/en/model-studio/model-pricing#e2540d71a2utl) before calling. - When image set mode is disabled, this value represents the number of images to generate. The range is 1 to 4. Defaults to 1. - When image set mode is enabled, this value represents the maximum number of images to generate. The range is 1 to 12. Defaults to 12. The actual number is determined by the model and will not exceed n. **thinking\\_mode** `*boolean*` (Optional) Enables thinking mode. Defaults to `true`. This parameter is effective only when image set mode is disabled and no image is input. When enabled, the model enhances its inference capabilities to improve output quality, but this increases generation time. **color\\_palette** `*array*` (Optional) A custom color theme. An array of objects, each with a hexadecimal color and a ratio. Must include 3 to 10 colors. 8 colors recommended. This is available only when image set mode is disabled (`enable_sequential=false`). **Properties** **hex** `*string*` **(Required)** The color value in hexadecimal (HEX) format. **ratio** `*string*` **(Required)** The percentage of the color. Must be accurate to two decimal places (such as `"25.00%"`). The sum of all ratio values must be 100.00%. **Click to view an input example** ``` "color_palette": [ { "hex": "#C2D1E6", "ratio": "23.51%" }, { "hex": "#CDD8E9", "ratio": "20.13%" }, { "hex": "#B5C8DB", "ratio": "15.88%" }, { "hex": "#C0B5B4", "ratio": "13.27%" }, { "hex": "#DAE0EC", "ratio": "10.11%" }, { "hex": "#636574", "ratio": "8.93%" }, { "hex": "#CACAD2", "ratio": "5.55%" }, { "hex": "#CBD4E4", "ratio": "2.62%" } ] ``` **watermark** `*bool*` (Optional) Adds a watermark label in the bottom-right corner of the image with fixed text "AI Generated". - false (default) - true **seed** `*integer*` (optional) Random number seed. Valid range: `[0,2147483647]`. Using the same `seed` yields similar outputs. If omitted, the algorithm uses a random seed. **Note:** Image generation is probabilistic. Even with the same `seed`, results may vary. |

| #### Response parameters | #### Successful response Save the `task_id` to query the task status and result. ``` { "output": { "task_status": "PENDING", "task_id": "0385dc79-5ff8-4d82-bcb6-xxxxxx" }, "request_id": "4909100c-7b5a-9f92-bfe5-xxxxxx" } ``` #### Error response Task creation failed. See [Error codes](/help/en/model-studio/error-code). ``` { "code": "InvalidApiKey", "message": "No API-key provided.", "request_id": "7438d53d-6eb8-4596-8835-xxxxxx" } ``` |
| --- | --- |
| **output** `*object*` Task output information. **Properties** **task\\_id** `*string*` The task ID. Valid for queries for 24 hours. **task\\_status** `*string*` The status of the task. **Enumeration values** - PENDING - RUNNING - SUCCEEDED - FAILED - CANCELED - UNKNOWN: The task does not exist or its status is unknown. |
| **request\\_id** `*string*` Unique request identifier for tracing and troubleshooting. |
| **code** `*string*` Error code. Returned only for failed requests. See [Error codes](/help/en/model-studio/error-code). |     |
| **message** `*string*` Detailed error message. Returned only for failed requests. See [Error codes](/help/en/model-studio/error-code). |     |

### Step 2: Query the result by task ID

## **Singapore**

`GET https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/tasks/{task_id}`

## **Beijing**

`GET https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api/v1/tasks/{task_id}`

| #### Request parameters | ## Query task result Replace `{task_id}` with the `task_id` value returned by the previous API call. The `task_id` is valid for queries for 24 hours. ``` curl -X GET https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/tasks/{task_id} \\ --header "Authorization: Bearer $DASHSCOPE_API_KEY" ``` |
| --- | --- |
| ##### **Headers** |
| **Authorization** `*string*` **(Required)** Authenticates the request with a Model Studio API key. Example: Bearer sk-xxxx. |
| ##### **Path parameters** |
| **task\\_id** `*string*` **(Required)** The ID of the task. |

| #### Response parameters | ## Successful task execution Task data (task status and image URLs) is retained for only 24 hours and then automatically purged. Save generated images promptly. ``` { "request_id": "810fa5f5-334c-91f3-aaa4-ed89cf0caxxx", "output": { "task_id": "a81ee7cb-014c-473d-b842-76e98311cxxx", "task_status": "SUCCEEDED", "submit_time": "2026-03-26 17:16:01.663", "scheduled_time": "2026-03-26 17:16:01.716", "end_time": "2026-03-26 17:16:22.961", "finished": true, "choices": [ { "finish_reason": "stop", "message": { "role": "assistant", "content": [ { "image": "https://dashscope-xxx.oss-xxx.aliyuncs.com/xxx.png?Expires=xxx", "type": "image" } ] } } ] }, "usage": { "size": "2976*1408", "total_tokens": 11017, "image_count": 1, "output_tokens": 2, "input_tokens": 11015 } } ``` ## Abnormal task execution If a task fails, the `code` and `message` fields in the response indicate the error cause. See [Error codes](/help/en/model-studio/error-code). ``` { "request_id": "a4d78a5f-655f-9639-8437-xxxxxx", "code": "InvalidParameter", "message": "num_images_per_prompt must be 1" } ``` |
| --- | --- |
| **output** `*object*` Task output information. **Properties** **task\\_id** `*string*` The task ID. Valid for queries for 24 hours. **task\\_status** `*string*` The status of the task. **Enumeration values** - PENDING - RUNNING - SUCCEEDED - FAILED - CANCELED - UNKNOWN: The task does not exist or its status is unknown. **State transitions during polling:** - PENDING → RUNNING → SUCCEEDED or FAILED. - The initial query status is usually PENDING or RUNNING. - When the status changes to SUCCEEDED, the response contains the generated image URL. - If the status is FAILED, check the error message and retry the task. **submit\\_time** `*string*` The time when the task was submitted. The time is in UTC+8 and the format is YYYY-MM-DD HH:mm:ss.SSS. **scheduled\\_time** `*string*` The time when the task was executed. The time is in UTC+8 and the format is YYYY-MM-DD HH:mm:ss.SSS. **end\\_time** `*string*` The time when the task was completed. The time is in UTC+8 and the format is YYYY-MM-DD HH:mm:ss.SSS. **finished** `*boolean*` Indicates whether the task is finished. Default: false. **choices** `*array*` The output content generated by the model. **Properties** **finish\\_reason** `*string*` The reason the task stopped. `stop` indicates natural completion. **message** `*object*` The message returned by the model. **Properties** **role** `*string*` The message role. Always `assistant`. **content** `*array*` **Properties** **type** `*string*` Values: text, image. **text** `*string*` The generated text. **image** `*string*` The URL of the generated image. Format: PNG. **The link is valid for 24 hours**. Download the image promptly. |
| **usage** `*object*` Usage statistics for the request. Only successful results are counted. **Properties** **image\\_count** `*integer*` The number of generated images. **size** `*string*` The resolution of the generated image. Example: 1376\\*768. **input\\_tokens** `*integer*` The number of input tokens (not billed). Billing is based on the number of images. **output\\_tokens** `*integer*` The number of output tokens (not billed). Billing is based on the number of images. **total\\_tokens** `*integer*` The total number of tokens (not billed). Billing is based on the number of images. |
| **request\\_id** `*string*` Unique request identifier for tracing and troubleshooting. |
| **code** `*string*` Error code. Returned only for failed requests. See [Error codes](/help/en/model-studio/error-code). |
| **message** `*string*` Detailed error message. Returned only for failed requests. See [Error codes](/help/en/model-studio/error-code). |

## **Python SDK**

SDK parameter names are largely consistent with the HTTP API.

Image generation tasks can take time, so the SDK wraps the HTTP asynchronous workflow. Both synchronous and asynchronous calls are supported.

> Task duration depends on queue length and service status.

**Important**

Make sure your DashScope Python SDK version is **1.25.15** **or later**. To update, see [Install SDK](/help/en/model-studio/install-sdk).

Both `base_url` and API key are region-specific. The following example uses the Singapore region:

### Singapore

`https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1`

When calling, replace `{WorkspaceId}` with your actual [workspace ID](/help/en/model-studio/obtain-the-app-id-and-workspace-id#d3eb3cd37b7fu).

### China (Beijing)

`https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api/v1`

When calling, replace `{WorkspaceId}` with your actual [workspace ID](/help/en/model-studio/obtain-the-app-id-and-workspace-id#d3eb3cd37b7fu).

### **Image editing**

## **Synchronous call**

##### **Request example**

```
import os
import base64
import mimetypes
import urllib.request
import dashscope
from dashscope.aigc.image_generation import ImageGeneration
from dashscope.api_entities.dashscope_response import Message

# The following base_url is for the Singapore region. Replace {WorkspaceId} with your Bailian workspace ID. The base_url varies by region.
dashscope.base_http_api_url = "https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1"

# If you have not configured environment variables, replace the following line with your Model Studio API key: api_key="sk-xxx"
# The API key varies by region. To obtain an API key, visit: https://www.alibabacloud.com/help/en/model-studio/get-api-key
api_key = os.getenv("DASHSCOPE_API_KEY")

# --- Base64 encoding function ---
# The Base64 encoding format is data:{MIME_type};base64,{base64_data}
def encode_file(file_path):
    mime_type, _ = mimetypes.guess_type(file_path)
    if not mime_type or not mime_type.startswith("image/"):
        raise ValueError("Unsupported or unrecognized image format")
    with open(file_path, "rb") as image_file:
        encoded_string = base64.b64encode(image_file.read()).decode("utf-8")
    return f"data:{mime_type};base64,{encoded_string}"

"""
Image input methods:
The following are three methods for image input. You need to choose only one.
1. Use a public URL: This method is suitable for publicly accessible images.
2. Use a local file: This method is suitable for local development and testing.
3. Use Base64 encoding: This method is suitable for private images or scenarios that require encrypted transmission.
"""
# [Method 1] Use a public image URL
image_1 = "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20251229/pjeqdf/car.webp"
image_2 = "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20251229/xsunlm/paint.webp"

# [Method 2] Use a local file (supports absolute and relative paths)
# image_1 = "file:///path/to/your/car.png"
# image_2 = "file:///path/to/your/paint.png"

# [Method 3] Use a Base64-encoded image
# image_1 = encode_file("/path/to/your/car.png")
# image_2 = encode_file("/path/to/your/paint.png")

message = Message(
    role="user",
    content=[
        {"text": "Spray the graffiti from image 2 onto the car in image 1"},
        {"image": image_1},
        {"image": image_2},
    ],
)
print("----sync call, please wait a moment----")
rsp = ImageGeneration.call(
    model="wan2.7-image-pro",
    api_key=api_key,
    messages=[message],
    watermark=False,
    n=1,
    size="2K",  # wan2.7-image-pro supports 4K resolution only for text-to-image generation. Image editing and multi-image generation support up to 2K resolution.
)

# Extract the result image URL and save the image to a local file.
if rsp.status_code == 200:
    for i, choice in enumerate(rsp.output.choices):
        for j, content in enumerate(choice["message"]["content"]):
            if content.get("type") == "image":
                image_url = content["image"]
                file_name = f"output_{i}_{j}.png"
                # The result URL is valid for 24 hours. Please download it promptly.
                urllib.request.urlretrieve(image_url, file_name)
                print(f"Image saved to {file_name}")
else:
    print(f"Failed: status_code={rsp.status_code}, message={rsp.message}")
```

##### Response example

> The URL is valid for 24 hours. Download the image promptly.

```
{
    "status_code": 200,
    "request_id": "81d868c6-6ce1-92d8-a90d-d2ee71xxxxxx",
    "code": "",
    "message": "",
    "output": {
        "text": null,
        "finish_reason": null,
        "choices": [
            {
                "finish_reason": "stop",
                "message": {
                    "role": "assistant",
                    "content": [
                        {
                            "image": "https://dashscope-result-bj.oss-cn-beijing.aliyuncs.com/xxxxxx.png?Expires=xxxxxx",
                            "type": "image"
                        }
                    ]
                }
            }
        ],
        "audio": null,
        "finished": true
    },
    "usage": {
        "input_tokens": 18790,
        "output_tokens": 2,
        "characters": 0,
        "image_count": 1,
        "size": "2985*1405",
        "total_tokens": 18792
    }
}
```

## **Asynchronous call**

##### **Request example**

```
import os
import base64
import mimetypes
import urllib.request
import dashscope
from dashscope.aigc.image_generation import ImageGeneration
from dashscope.api_entities.dashscope_response import Message
from http import HTTPStatus

# The following base_url is for the Singapore region. Replace {WorkspaceId} with your Bailian workspace ID. The base_url varies by region.
dashscope.base_http_api_url = "https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1"

# If you have not configured environment variables, replace the following line with your Model Studio API key: api_key="sk-xxx"
# The API key varies by region. To obtain an API key, visit https://www.alibabacloud.com/help/en/model-studio/get-api-key
api_key = os.getenv("DASHSCOPE_API_KEY")

# --- Base64 encoding function ---
# The Base64 encoding format is data:{MIME_type};base64,{base64_data}
def encode_file(file_path):
    mime_type, _ = mimetypes.guess_type(file_path)
    if not mime_type or not mime_type.startswith("image/"):
        raise ValueError("Unsupported or unrecognized image format.")
    with open(file_path, "rb") as image_file:
        encoded_string = base64.b64encode(image_file.read()).decode("utf-8")
    return f"data:{mime_type};base64,{encoded_string}"

"""
Image input methods:
Three image input methods are provided below. Choose one.
1. Use a public URL - suitable for publicly accessible images.
2. Use a local file - suitable for local development and testing.
3. Use Base64 encoding - suitable for private images or scenarios that require encrypted transmission.
"""
# [Method 1] Use a public image URL
image_1 = "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20251229/pjeqdf/car.webp"
image_2 = "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20251229/xsunlm/paint.webp"

# [Method 2] Use a local file (supports absolute and relative paths)
# image_1 = "file:///path/to/your/car.png"
# image_2 = "file:///path/to/your/paint.png"

# [Method 3] Use a Base64-encoded image
# image_1 = encode_file("/path/to/your/car.png")
# image_2 = encode_file("/path/to/your/paint.png")

# Create an asynchronous task.
def create_async_task():
    print("Creating async task...")
    message = Message(
        role="user",
        content=[
            {"text": "Spray the graffiti from image 2 onto the car in image 1."},
            {"image": image_1},
            {"image": image_2},
        ],
    )
    response = ImageGeneration.async_call(
        model="wan2.7-image-pro",
        api_key=api_key,
        messages=[message],
        watermark=False,
        n=1,
        size="2K",  # wan2.7-image-pro supports 4K resolution only for text-to-image generation scenarios. Image editing and collage generation support a maximum resolution of 2K.
    )

    if response.status_code == 200:
        print("Task created successfully:", response)
        return response
    else:
        raise Exception(f"Failed to create task: {response.code} - {response.message}")

# Wait for the task to complete.
def wait_for_completion(task_response):
    print("Waiting for task completion...")
    status = ImageGeneration.wait(task=task_response, api_key=api_key)

    if status.output.task_status == "SUCCEEDED":
        print("Task succeeded!")
        # Extract the result image URL and save the image to a local file.
        for i, choice in enumerate(status.output.choices):
            for j, content in enumerate(choice["message"]["content"]):
                if content.get("type") == "image":
                    image_url = content["image"]
                    file_name = f"output_{i}_{j}.png"
                    # The result URL is valid for 24 hours. Download the image in a timely manner.
                    urllib.request.urlretrieve(image_url, file_name)
                    print(f"Image saved to {file_name}")
    else:
        raise Exception(f"Task failed with status: {status.output.task_status}")

# Obtain information about the asynchronous task.
def fetch_task_status(task):
    print("Fetching task status...")
    status = ImageGeneration.fetch(task=task, api_key=api_key)

    if status.status_code == HTTPStatus.OK:
        print("Task status:", status.output.task_status)
        print("Response details:", status)
    else:
        print(f"Failed to fetch status: {status.code} - {status.message}")

# Cancel the asynchronous task.
def cancel_task(task):
    print("Canceling task...")
    response = ImageGeneration.cancel(task=task, api_key=api_key)

    if response.status_code == HTTPStatus.OK:
        print("Task canceled successfully:", response.output.task_status)
    else:
        print(f"Failed to cancel task: {response.code} - {response.message}")

# Main execution flow.
if __name__ == "__main__":
    task = create_async_task()
    wait_for_completion(task)
```

##### Response example

1.  Response example for creating a task
    
    ```
    {
        "status_code": 200,
        "request_id": "4fb3050f-de57-4a24-84ff-e37ee5xxxxxx",
        "code": "",
        "message": "",
        "output": {
            "text": null,
            "finish_reason": null,
            "choices": null,
            "audio": null,
            "task_id": "127ec645-118f-4884-955d-0eba8dxxxxxx",
            "task_status": "PENDING"
        },
        "usage": {
            "input_tokens": 0,
            "output_tokens": 0,
            "characters": 0
        }
    }
    ```
    
2.  Response example for querying a task result
    
    > The URL is valid for 24 hours. Download the image promptly.
    
    ```
    {
        "status_code": 200,
        "request_id": "3b99aae5-d26f-9059-8dd0-ee9ca4804xxx",
        "code": null,
        "message": "",
        "output": {
            "text": null,
            "finish_reason": null,
            "choices": [
                {
                    "finish_reason": "stop",
                    "message": {
                        "role": "assistant",
                        "content": [
                            {
                                "image": "https://dashscope-result-bj.oss-cn-beijing.aliyuncs.com/xxxxxx.png?Expires=xxxxxx",
                                "type": "image"
                            }
                        ]
                    }
                }
            ],
            "audio": null,
            "task_id": "127ec645-118f-4884-955d-0eba8dxxxxxx",
            "task_status": "SUCCEEDED",
            "submit_time": "2026-03-31 22:58:47.646",
            "scheduled_time": "2026-03-31 22:58:47.683",
            "end_time": "2026-03-31 22:58:59.642",
            "finished": true
        },
        "usage": {
            "input_tokens": 18711,
            "output_tokens": 2,
            "characters": 0,
            "size": "2985*1405",
            "total_tokens": 18713,
            "image_count": 1
        }
    }
    ```
    

### **Image set generation**

## **Synchronous call**

##### **Request example**

```
import os
import base64
import mimetypes
import urllib.request
import dashscope
from dashscope.aigc.image_generation import ImageGeneration
from dashscope.api_entities.dashscope_response import Message

# The following base_url is for the Singapore region. Replace {WorkspaceId} with your Bailian workspace ID. The base_url varies by region.
dashscope.base_http_api_url = "https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1"

# If you have not configured the environment variable, replace the following line with your Model Studio API key: api_key="sk-xxx"
# The API key varies by region. To obtain an API key, visit: https://www.alibabacloud.com/help/en/model-studio/get-api-key
api_key = os.getenv("DASHSCOPE_API_KEY")

# --- Base64 encoding function ---
# The Base64 encoding format is data:{MIME_type};base64,{base64_data}
def encode_file(file_path):
    mime_type, _ = mimetypes.guess_type(file_path)
    if not mime_type or not mime_type.startswith("image/"):
        raise ValueError("Unsupported or unrecognized image format")
    with open(file_path, "rb") as image_file:
        encoded_string = base64.b64encode(image_file.read()).decode("utf-8")
    return f"data:{mime_type};base64,{encoded_string}"

"""
Description of image input methods (for image-to-image sequence generation):
Choose one of the following three image input methods:
1. Use a public URL - Suitable for publicly accessible images.
2. Use a local file - Suitable for local development and testing.
3. Use Base64 encoding - Suitable for private images or scenarios that require encrypted transmission.
"""
# [Method 1] Use a public image URL
# image_1 = "https://img.alicdn.com/imgextra/i4/O1CN01IM44WN23dq5uY1yla_!!6000000007279-49-tps-1024-1024.webp"

# [Method 2] Use a local file (supports both absolute and relative paths)
# image_1 = "file:///path/to/your/image.png"

# [Method 3] Use a Base64-encoded image
# image_1 = encode_file("/path/to/your/image.png")

message = Message(
    role="user",
    content=[
        {
            "text": "A cinematic image sequence featuring the same stray orange cat, whose features must be consistent across all images. First image: In spring, the orange cat weaves through blooming cherry blossom trees. Second image: In summer, the orange cat cools off in the shade of a tree on an old street. Third image: In autumn, the orange cat walks on a carpet of golden fallen leaves. Fourth image: In winter, the orange cat leaves footprints as it walks on the snow."
        }
        # For image-to-image sequence generation: Uncomment the following lines and comment out the plain text above.
        # {"text": "Generate a four-seasons image sequence based on the style of the reference image"},
        # {"image": image_1}
    ],
)

print("----sync call, please wait a moment----")
rsp = ImageGeneration.call(
    model="wan2.7-image-pro",
    api_key=api_key,
    messages=[message],
    enable_sequential=True,
    n=4,
    size="2K",  # wan2.7-image-pro supports 4K resolution only in text-to-image scenarios. Image editing and image sequence generation support a maximum resolution of 2K.
)

# Extract the resulting image URLs and save the images locally.
if rsp.status_code == 200:
    for i, choice in enumerate(rsp.output.choices):
        for j, content in enumerate(choice["message"]["content"]):
            if content.get("type") == "image":
                image_url = content["image"]
                file_name = f"output_{i}_{j}.png"
                # The result URL is valid for 24 hours. Download the image promptly.
                urllib.request.urlretrieve(image_url, file_name)
                print(f"Image saved to {file_name}")
else:
    print(f"Failed: status_code={rsp.status_code}, message={rsp.message}")
```

##### Response example

> The URL is valid for 24 hours. Download the image promptly.

```
{
    "status_code": 200,
    "request_id": "56e318fd-ed60-99e8-8ca1-cdef25ca4xxx",
    "code": "",
    "message": "",
    "output": {
        "text": null,
        "finish_reason": null,
        "choices": [
            {
                "finish_reason": "stop",
                "message": {
                    "role": "assistant",
                    "content": [
                        {
                            "image": "https://dashscope-result-bj.oss-cn-beijing.aliyuncs.com/xxxxxx.png?Expires=xxxxxx",
                            "type": "image"
                        },
                        {
                            "image": "https://dashscope-result-bj.oss-cn-beijing.aliyuncs.com/xxxxxx.png?Expires=xxxxxx",
                            "type": "image"
                        },
                        {
                            "image": "https://dashscope-result-bj.oss-cn-beijing.aliyuncs.com/xxxxxx.png?Expires=xxxxxx",
                            "type": "image"
                        },
                        {
                            "image": "https://dashscope-result-bj.oss-cn-beijing.aliyuncs.com/xxxxxx.png?Expires=xxxxxx",
                            "type": "image"
                        }
                    ]
                }
            }
        ],
        "audio": null,
        "finished": true
    },
    "usage": {
        "input_tokens": 720,
        "output_tokens": 11,
        "characters": 0,
        "image_count": 4,
        "size": "2048*2048",
        "total_tokens": 731
    }
}
```

## **Asynchronous call**

##### **Request example**

```
import os
import base64
import mimetypes
import urllib.request
import dashscope
from dashscope.aigc.image_generation import ImageGeneration
from dashscope.api_entities.dashscope_response import Message

# The following base_url is for the Singapore region. Replace {WorkspaceId} with your Bailian workspace ID. The base_url varies by region.
dashscope.base_http_api_url = "https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1"

# If you have not configured the DASHSCOPE_API_KEY environment variable, replace the following line with your Model Studio API key: api_key="sk-xxx"
# The API key varies by region. To obtain an API key, visit: https://www.alibabacloud.com/help/en/model-studio/get-api-key
api_key = os.getenv("DASHSCOPE_API_KEY")

# --- Base64 encoding function ---
# The Base64 data URI scheme is data:{MIME_type};base64,{base64_data}
def encode_file(file_path):
    mime_type, _ = mimetypes.guess_type(file_path)
    if not mime_type or not mime_type.startswith("image/"):
        raise ValueError("Unsupported or unrecognized image format")
    with open(file_path, "rb") as image_file:
        encoded_string = base64.b64encode(image_file.read()).decode("utf-8")
    return f"data:{mime_type};base64,{encoded_string}"

"""
Description of image input methods (for image-to-image sequence generation):
The following three image input methods are provided. Choose one of them.
1. Use a public URL: Suitable for images that are publicly accessible.
2. Use a local file: Suitable for local development and testing.
3. Use Base64 encoding: Suitable for private images or scenarios that require encrypted transmission.
"""
# [Method 1] Use a public image URL
# image_1 = "https://img.alicdn.com/imgextra/i4/O1CN01IM44WN23dq5uY1yla_!!6000000007279-49-tps-1024-1024.webp"

# [Method 2] Use a local file (absolute and relative paths are supported)
# image_1 = "file:///path/to/your/image.png"

# [Method 3] Use a Base64-encoded image
# image_1 = encode_file("/path/to/your/image.png")

def main():
    message = Message(
        role="user",
        content=[
            {
                "text": "A cinematic sequence of images documenting the same stray orange cat, whose features must remain consistent across all images. Image 1: In spring, the cat weaves through blooming cherry blossom trees. Image 2: In summer, the cat cools off in the shade of trees on an old street. Image 3: In autumn, the cat steps on a carpet of golden fallen leaves. Image 4: In winter, the cat walks on the snow, leaving footprints."
            }
            # Image-to-image sequence generation scenario: Uncomment the following lines and comment out the plain text above.
            # {"text": "Generate a sequence of four seasonal images based on the style of the reference image."},
            # {"image": image_1}
        ],
    )

    # Submit an asynchronous task
    print("Submitting an asynchronous task...")
    response = ImageGeneration.async_call(
        model="wan2.7-image-pro",
        api_key=api_key,
        messages=[message],
        enable_sequential=True,
        n=4,
        size="2K",  # wan2.7-image-pro supports 4K resolution only in text-to-image scenarios. Image editing and image sequence generation support a maximum resolution of 2K.
    )

    if response.status_code == 200:
        print(f"Task submitted successfully. Task ID: {response.output.task_id}")

        # Wait for the task to complete
        status = ImageGeneration.wait(task=response, api_key=api_key)

        if status.output.task_status == "SUCCEEDED":
            print("Task completed!")
            # Extract the result image URLs and save them to a local device.
            for i, choice in enumerate(status.output.choices):
                for j, content in enumerate(choice["message"]["content"]):
                    if content.get("type") == "image":
                        image_url = content["image"]
                        file_name = f"output_{i}_{j}.png"
                        # The result URLs are valid for 24 hours. Download the images in a timely manner.
                        urllib.request.urlretrieve(image_url, file_name)
                        print(f"Image saved to {file_name}")
        else:
            print(f"Task failed. Status: {status.output.task_status}")
    else:
        print(f"Failed to create the task: {response.code} - {response.message}")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"Error: {e}")
```

##### Response example

1.  Response example for creating a task
    
    ```
    {
        "status_code": 200,
        "request_id": "4fb3050f-de57-4a24-84ff-e37ee5xxxxxx",
        "code": "",
        "message": "",
        "output": {
            "text": null,
            "finish_reason": null,
            "choices": null,
            "audio": null,
            "task_id": "77093787-a217-4c29-9cd4-ca7b5ac86xxx",
            "task_status": "PENDING"
        },
        "usage": {
            "input_tokens": 0,
            "output_tokens": 0,
            "characters": 0
        }
    }
    ```
    
2.  Response example for querying a task result
    
    > The URL is valid for 24 hours. Download the image promptly.
    
    ```
    {
        "status_code": 200,
        "request_id": "56e318fd-ed60-99e8-8ca1-cdef25ca4xxx",
        "code": "",
        "message": "",
        "output": {
            "text": null,
            "finish_reason": null,
            "choices": [
                {
                    "finish_reason": "stop",
                    "message": {
                        "role": "assistant",
                        "content": [
                            {
                                "image": "https://dashscope-result-bj.oss-cn-beijing.aliyuncs.com/xxxxxx.png?Expires=xxxxxx",
                                "type": "image"
                            },
                            {
                                "image": "https://dashscope-result-bj.oss-cn-beijing.aliyuncs.com/xxxxxx.png?Expires=xxxxxx",
                                "type": "image"
                            },
                            {
                                "image": "https://dashscope-result-bj.oss-cn-beijing.aliyuncs.com/xxxxxx.png?Expires=xxxxxx",
                                "type": "image"
                            },
                            {
                                "image": "https://dashscope-result-bj.oss-cn-beijing.aliyuncs.com/xxxxxx.png?Expires=xxxxxx",
                                "type": "image"
                            }
                        ]
                    }
                }
            ],
            "audio": null,
            "task_id": "77093787-a217-4c29-9cd4-ca7b5ac86xxx",
            "task_status": "SUCCEEDED",
            "submit_time": "2026-03-31 23:04:46.166",
            "scheduled_time": "2026-03-31 23:04:46.208",
            "end_time": "2026-03-31 23:05:11.664",
            "finished": true
        },
        "usage": {
            "input_tokens": 720,
            "output_tokens": 11,
            "characters": 0,
            "size": "2048*2048",
            "total_tokens": 731,
            "image_count": 4
        }
    }
    ```
    

## **Java SDK**

SDK parameter names are largely consistent with the HTTP API.

Image generation tasks can take time, so the SDK wraps the HTTP asynchronous workflow. Both synchronous and asynchronous calls are supported.

**Important**

Make sure your DashScope Java SDK version is `2.22.13` or later.

### Singapore

`https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1`

When calling, replace `{WorkspaceId}` with your actual [workspace ID](/help/en/model-studio/obtain-the-app-id-and-workspace-id#d3eb3cd37b7fu).

### China (Beijing)

`https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api/v1`

When calling, replace `{WorkspaceId}` with your actual [workspace ID](/help/en/model-studio/obtain-the-app-id-and-workspace-id#d3eb3cd37b7fu).

### **Image editing**

## **Synchronous call**

##### Request example

```
import com.alibaba.dashscope.aigc.imagegeneration.*;
import com.alibaba.dashscope.exception.ApiException;
import com.alibaba.dashscope.exception.NoApiKeyException;
import com.alibaba.dashscope.exception.UploadFileException;
import com.alibaba.dashscope.utils.Constants;
import com.alibaba.dashscope.utils.JsonUtils;

import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Arrays;
import java.util.Base64;
import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * wan2.7-image-pro Image Editing - Synchronous Call Example
 */
public class Main {

    static {
        // The following URL is for the Singapore region. Replace {WorkspaceId} with your Bailian workspace ID. The base_url varies by region.
        Constants.baseHttpApiUrl = "https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1";
    }

    // If you have not configured an environment variable, replace the following line with your Model Studio API key: apiKey="sk-xxx"
    // The API key varies by region. To obtain an API key, visit https://www.alibabacloud.com/help/en/model-studio/get-api-key
    static String apiKey = System.getenv("DASHSCOPE_API_KEY");

    // --- Base64 encoding function ---
    // Base64 encoding format: data:{MIME_type};base64,{base64_data}
    public static String encodeFile(String filePath) throws IOException {
        byte[] fileContent = Files.readAllBytes(Paths.get(filePath));
        String base64String = Base64.getEncoder().encodeToString(fileContent);
        String mimeType = Files.probeContentType(Paths.get(filePath));
        return "data:" + mimeType + ";base64," + base64String;
    }

    public static void basicCall() throws ApiException, NoApiKeyException, UploadFileException, IOException {
        /*
         * Description of image input methods:
         * Three image input methods are provided below. Select one.
         * 1. Use a public URL: Suitable for publicly accessible images.
         * 2. Use a local file: Suitable for local development and testing.
         * 3. Use Base64 encoding: Suitable for private images or scenarios that require encrypted transmission.
         */
        // Method 1: Use a public image URL.
        String image1 = "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20251229/pjeqdf/car.webp";
        String image2 = "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20251229/xsunlm/paint.webp";

        // Method 2: Use a local file. Both absolute and relative paths are supported.
        // Format: file:// + file path
        // String image1 = "file:///path/to/your/car.png";
        // String image2 = "file:///path/to/your/paint.png";

        // Method 3: Use a Base64-encoded image.
        // String image1 = encodeFile("/path/to/your/car.png");
        // String image2 = encodeFile("/path/to/your/paint.png");

        // Build a multi-image input message.
        ImageGenerationMessage message = ImageGenerationMessage.builder()
                .role("user")
                .content(Arrays.asList(
                        // Multi-image input is supported. You can provide multiple reference images.
                        Collections.singletonMap("text", "Spray the graffiti from image 2 onto the car in image 1"),
                        Collections.singletonMap("image", image1),
                        Collections.singletonMap("image", image2)
                )).build();

        ImageGenerationParam param = ImageGenerationParam.builder()
                .apiKey(apiKey)
                .model("wan2.7-image-pro")
                .messages(Collections.singletonList(message))
                .n(1)
                .size("2K") // For wan2.7-image-pro, only the text-to-image generation scenario supports 4K resolution. Image editing and collage generation support a maximum resolution of 2K.
                .build();

        ImageGeneration imageGeneration = new ImageGeneration();
        ImageGenerationResult result = null;
        try {
            System.out.println("---sync call for image editing, please wait a moment----");
            result = imageGeneration.call(param);
        } catch (ApiException | NoApiKeyException | UploadFileException e) {
            throw new RuntimeException(e.getMessage());
        }
        // Extract the result image URL and save it to a local file.
        for (int i = 0; i < result.getOutput().getChoices().size(); i++) {
            List<Map<String, Object>> contents = result.getOutput().getChoices().get(i)
                    .getMessage().getContent();
            for (int j = 0; j < contents.size(); j++) {
                if ("image".equals(contents.get(j).get("type"))) {
                    String imageUrl = (String) contents.get(j).get("image");
                    String fileName = "output_" + i + "_" + j + ".png";
                    // The result URL is valid for 24 hours. Download the image in a timely manner.
                    try (InputStream in = new URL(imageUrl).openStream()) {
                        Files.copy(in, Paths.get(fileName), StandardCopyOption.REPLACE_EXISTING);
                    }
                    System.out.println("Image saved to " + fileName);
                }
            }
        }
    }

    public static void main(String[] args) throws ApiException, NoApiKeyException, UploadFileException, IOException {
        basicCall();
    }
}
```

##### Response example

> The URL is valid for 24 hours. Save it promptly.

```
{
    "requestId": "1bf6173a-e8de-9f75-94d3-5e618f875xxx",
    "usage": {
        "input_tokens": 18790,
        "output_tokens": 2,
        "total_tokens": 18792,
        "image_count": 1,
        "size": "2985*1405"
    },
    "output": {
        "choices": [
            {
                "finish_reason": "stop",
                "message": {
                    "role": "assistant",
                    "content": [
                        {
                            "image": "https://dashscope-result-bj.oss-cn-beijing.aliyuncs.com/xxxxxx.png?Expires=xxxxxx",
                            "type": "image"
                        }
                    ]
                }
            }
        ],
        "finished": true
    },
    "status_code": 200,
    "code": "",
    "message": ""
}
```

## **Asynchronous call**

##### Request example

```
import com.alibaba.dashscope.aigc.imagegeneration.*;
import com.alibaba.dashscope.exception.ApiException;
import com.alibaba.dashscope.exception.NoApiKeyException;
import com.alibaba.dashscope.exception.UploadFileException;
import com.alibaba.dashscope.utils.Constants;
import com.alibaba.dashscope.utils.JsonUtils;

import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Arrays;
import java.util.Base64;
import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * wan2.7-image-pro Image Editing - Asynchronous Invocation Example
 */
public class Main {

    static {
        // The following URL is for the Singapore region. Replace {WorkspaceId} with your Bailian workspace ID. The base_url varies by region.
        Constants.baseHttpApiUrl = "https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1";
    }

    // If you have not configured an environment variable, replace the following line with your Model Studio API key: apiKey="sk-xxx"
    // The API key varies by region. To obtain an API key, visit: https://www.alibabacloud.com/help/en/model-studio/get-api-key
    static String apiKey = System.getenv("DASHSCOPE_API_KEY");

    // --- Base64 encoding function ---
    // The Base64 encoding format is data:{MIME_type};base64,{base64_data}
    public static String encodeFile(String filePath) throws IOException {
        byte[] fileContent = Files.readAllBytes(Paths.get(filePath));
        String base64String = Base64.getEncoder().encodeToString(fileContent);
        String mimeType = Files.probeContentType(Paths.get(filePath));
        return "data:" + mimeType + ";base64," + base64String;
    }

    public static void asyncCall() throws ApiException, NoApiKeyException, UploadFileException, IOException {
        /*
         * Description of image input methods:
         * The following three image input methods are provided. You can choose one of them.
         * 1. Use a public URL - Suitable for publicly accessible images.
         * 2. Use a local file - Suitable for local development and testing.
         * 3. Use Base64 encoding - Suitable for scenarios that involve private images or require encrypted transmission.
         */
        // [Method 1] Use a public image URL
        String image1 = "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20251229/pjeqdf/car.webp";
        String image2 = "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20251229/xsunlm/paint.webp";

        // [Method 2] Use a local file (supports absolute and relative paths)
        // Required format: file:// + file path
        // String image1 = "file:///path/to/your/car.png";
        // String image2 = "file:///path/to/your/paint.png";

        // [Method 3] Use a Base64-encoded image
        // String image1 = encodeFile("/path/to/your/car.png");
        // String image2 = encodeFile("/path/to/your/paint.png");

        // Build a multi-image input message
        ImageGenerationMessage message = ImageGenerationMessage.builder()
                .role("user")
                .content(Arrays.asList(
                        // Supports multi-image input. You can provide multiple reference images.
                        Collections.singletonMap("text", "Spray-paint the graffiti from image 2 onto the car in image 1"),
                        Collections.singletonMap("image", image1),
                        Collections.singletonMap("image", image2)
                )).build();

        ImageGenerationParam param = ImageGenerationParam.builder()
                .apiKey(apiKey)
                .model("wan2.7-image-pro")
                .n(1)
                .size("2K") // The wan2.7-image-pro model supports 4K resolution only for text-to-image generation. For image editing and composite image generation, the maximum supported resolution is 2K.
                .messages(Arrays.asList(message))
                .build();

        ImageGeneration imageGeneration = new ImageGeneration();
        ImageGenerationResult result = null;
        try {
            System.out.println("---async call for image editing, creating task----");
            result = imageGeneration.asyncCall(param);
        } catch (ApiException | NoApiKeyException | UploadFileException e) {
            throw new RuntimeException(e.getMessage());
        }
        System.out.println("Task creation result:");
        System.out.println(JsonUtils.toJson(result));

        String taskId = result.getOutput().getTaskId();
        // Wait for the task to complete
        waitTask(taskId);
    }

    public static void waitTask(String taskId) throws ApiException, NoApiKeyException, IOException {
        ImageGeneration imageGeneration = new ImageGeneration();
        System.out.println("\n---waiting for task completion----");
        ImageGenerationResult result = imageGeneration.wait(taskId, apiKey);
        // Fetch the resulting image URL and save it to a local file
        for (int i = 0; i < result.getOutput().getChoices().size(); i++) {
            List<Map<String, Object>> contents = result.getOutput().getChoices().get(i)
                    .getMessage().getContent();
            for (int j = 0; j < contents.size(); j++) {
                if ("image".equals(contents.get(j).get("type"))) {
                    String imageUrl = (String) contents.get(j).get("image");
                    String fileName = "output_" + i + "_" + j + ".png";
                    // The result URL is valid for 24 hours. Download the image in a timely manner.
                    try (InputStream in = new URL(imageUrl).openStream()) {
                        Files.copy(in, Paths.get(fileName), StandardCopyOption.REPLACE_EXISTING);
                    }
                    System.out.println("Image saved to " + fileName);
                }
            }
        }
    }

    public static void main(String[] args) throws ApiException, NoApiKeyException, UploadFileException, IOException {
        asyncCall();
    }
}
```

##### Response example

1.  Response example for creating a task
    
    ```
    {
        "requestId": "ccf4b2f4-bf30-9e13-9461-3a28c6a7bxxx",
        "output": {
            "task_id": "8811b4a4-00ac-4aa2-a2fd-017d3b90cxxx",
            "task_status": "PENDING"
        },
        "status_code": 200,
        "code": "",
        "message": ""
    }
    ```
    
2.  Response example for querying a task result
    
    > The URL is valid for 24 hours. Save it promptly.
    
    ```
    {
        "requestId": "60a08540-f1c1-9e76-8cd3-d5949db8cxxx",
        "usage": {
            "input_tokens": 18711,
            "output_tokens": 2,
            "total_tokens": 18713,
            "image_count": 1,
            "size": "2985*1405"
        },
        "output": {
            "choices": [
                {
                    "finish_reason": "stop",
                    "message": {
                        "role": "assistant",
                        "content": [
                            {
                                "image": "https://dashscope-result-bj.oss-cn-beijing.aliyuncs.com/xxxxxx.png?Expires=xxxxxx",
                                "type": "image"
                            }
                        ]
                    }
                }
            ],
            "task_id": "8811b4a4-00ac-4aa2-a2fd-017d3b90cxxx",
            "task_status": "SUCCEEDED",
            "finished": true,
            "submit_time": "2026-03-31 19:57:58.840",
            "scheduled_time": "2026-03-31 19:57:58.877",
            "end_time": "2026-03-31 19:58:11.563"
        },
        "status_code": 200,
        "code": "",
        "message": ""
    }
    ```
    

### **Image set generation**

## **Synchronous call**

##### Request example

```
import com.alibaba.dashscope.aigc.imagegeneration.*;
import com.alibaba.dashscope.exception.ApiException;
import com.alibaba.dashscope.exception.NoApiKeyException;
import com.alibaba.dashscope.exception.UploadFileException;
import com.alibaba.dashscope.utils.Constants;
import com.alibaba.dashscope.utils.JsonUtils;

import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Arrays;
import java.util.Base64;
import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * An example of using wan2.7-image-pro for image series generation through synchronous calls in the Singapore region.
 */
public class Main {

    static {
        // The following URL is for the Singapore region. Replace {WorkspaceId} with your Bailian workspace ID. The base_url varies by region.
        Constants.baseHttpApiUrl = "https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1";
    }

    // If you have not configured the environment variable, replace the following line with your Model Studio API key: apiKey="sk-xxx"
    // API keys vary by region. To obtain an API key, visit: https://www.alibabacloud.com/help/en/model-studio/get-api-key
    static String apiKey = System.getenv("DASHSCOPE_API_KEY");

    // --- Base64 encoding function ---
    // The format for Base64 encoding is data:{MIME_type};base64,{base64_data}
    public static String encodeFile(String filePath) throws IOException {
        byte[] fileContent = Files.readAllBytes(Paths.get(filePath));
        String base64String = Base64.getEncoder().encodeToString(fileContent);
        String mimeType = Files.probeContentType(Paths.get(filePath));
        return "data:" + mimeType + ";base64," + base64String;
    }

    public static void basicCall() throws ApiException, NoApiKeyException, UploadFileException, IOException {
        /*
         * Image input methods (for image-to-image series generation):
         * Three image input methods are provided below. Choose one.
         * 1. Public URL: Suitable for images that are already publicly accessible.
         * 2. Local file: Suitable for local development and testing.
         * 3. Base64 encoding: Suitable for private images or scenarios that require encrypted transmission.
         */
        // Method 1: Use a public image URL
        // String image1 = "https://img.alicdn.com/imgextra/i4/O1CN01IM44WN23dq5uY1yla_!!6000000007279-49-tps-1024-1024.webp";

        // Method 2: Use a local file (supports both absolute and relative paths)
        // Format: file:// + file path
        // String image1 = "file:///path/to/your/image.png";

        // Method 3: Use a Base64-encoded image
        // String image1 = encodeFile("/path/to/your/image.png");

        // Build the text input message. This supports both text-to-image and image-to-image series generation. This example demonstrates text-to-image series generation.
        ImageGenerationMessage message = ImageGenerationMessage.builder()
                .role("user")
                .content(Collections.singletonList(
                        Collections.singletonMap("text", "A cinematic image series documenting the same stray orange cat, whose features must remain consistent. First image: In spring, the cat weaves through blooming cherry blossom trees. Second image: In summer, the cat cools off in the shade on an old street. Third image: In autumn, the cat walks on a carpet of golden fallen leaves. Fourth image: In winter, the cat leaves footprints in the snow.")
                )).build();
        // For image-to-image series generation, uncomment the following code and comment out the plain text message builder above.
        // ImageGenerationMessage message = ImageGenerationMessage.builder()
        //         .role("user")
        //         .content(Arrays.asList(
        //                 Collections.singletonMap("text", "Generate a four-season image series based on the style of the reference image."),
        //                 Collections.singletonMap("image", image1)
        //         )).build();

        ImageGenerationParam param = ImageGenerationParam.builder()
                .apiKey(apiKey)
                .model("wan2.7-image-pro")
                .messages(Collections.singletonList(message))
                .enableSequential(true)
                .n(4)
                .size("2K") // The wan2.7-image-pro model supports 4K resolution only for text-to-image generation. Image editing and image series generation support a maximum resolution of 2K.
                .build();

        ImageGeneration imageGeneration = new ImageGeneration();
        ImageGenerationResult result = null;
        try {
            System.out.println("----sync call, please wait a moment----");
            result = imageGeneration.call(param);
        } catch (ApiException | NoApiKeyException | UploadFileException e) {
            throw new RuntimeException(e.getMessage());
        }
        // Extract the resulting image URLs and save them to a local directory.
        for (int i = 0; i < result.getOutput().getChoices().size(); i++) {
            List<Map<String, Object>> contents = result.getOutput().getChoices().get(i)
                    .getMessage().getContent();
            for (int j = 0; j < contents.size(); j++) {
                if ("image".equals(contents.get(j).get("type"))) {
                    String imageUrl = (String) contents.get(j).get("image");
                    String fileName = "output_" + i + "_" + j + ".png";
                    // The resulting URL is valid for 24 hours. Be sure to download it promptly.
                    try (InputStream in = new URL(imageUrl).openStream()) {
                        Files.copy(in, Paths.get(fileName), StandardCopyOption.REPLACE_EXISTING);
                    }
                    System.out.println("Image saved to " + fileName);
                }
            }
        }
    }

    public static void main(String[] args) throws ApiException, NoApiKeyException, UploadFileException, IOException {
        basicCall();
    }
}
```

##### Response example

> The URL is valid for 24 hours. Save it promptly.

```
{
    "requestId": "4678c314-b37a-91c9-a2ae-2d3cd54bbxxx",
    "usage": {
        "input_tokens": 720,
        "output_tokens": 11,
        "total_tokens": 731,
        "image_count": 4,
        "size": "2048*2048"
    },
    "output": {
        "choices": [
            {
                "finish_reason": "stop",
                "message": {
                    "role": "assistant",
                    "content": [
                        {
                            "image": "https://dashscope-result-bj.oss-cn-beijing.aliyuncs.com/xxxxxx.png?Expires=xxxxxx",
                            "type": "image"
                        },
                        {
                            "image": "https://dashscope-result-bj.oss-cn-beijing.aliyuncs.com/xxxxxx.png?Expires=xxxxxx",
                            "type": "image"
                        },
                        {
                            "image": "https://dashscope-result-bj.oss-cn-beijing.aliyuncs.com/xxxxxx.png?Expires=xxxxxx",
                            "type": "image"
                        },
                        {
                            "image": "https://dashscope-result-bj.oss-cn-beijing.aliyuncs.com/xxxxxx.png?Expires=xxxxxx",
                            "type": "image"
                        }
                    ]
                }
            }
        ],
        "finished": true
    },
    "status_code": 200,
    "code": "",
    "message": ""
}
```

## **Asynchronous call**

##### Request example

```
import com.alibaba.dashscope.aigc.imagegeneration.*;
import com.alibaba.dashscope.exception.ApiException;
import com.alibaba.dashscope.exception.NoApiKeyException;
import com.alibaba.dashscope.exception.UploadFileException;
import com.alibaba.dashscope.utils.Constants;
import com.alibaba.dashscope.utils.JsonUtils;

import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Arrays;
import java.util.Base64;
import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * wan2.7-image-pro Image Set Generation - Asynchronous Invocation Example (Singapore Region)
 */
public class Main {

    static {
        // The following URL is for the Singapore region. Replace {WorkspaceId} with your Bailian workspace ID. The base_url varies by region.
        Constants.baseHttpApiUrl = "https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1";
    }

    // If you have not configured environment variables, replace the following line with your Model Studio API key: apiKey="sk-xxx"
    // The API key varies by region. To obtain an API key, visit https://www.alibabacloud.com/help/en/model-studio/get-api-key
    static String apiKey = System.getenv("DASHSCOPE_API_KEY");

    // --- Base64 encoding function ---
    // The Base64 encoding format is data:{MIME_type};base64,{base64_data}
    public static String encodeFile(String filePath) throws IOException {
        byte[] fileContent = Files.readAllBytes(Paths.get(filePath));
        String base64String = Base64.getEncoder().encodeToString(fileContent);
        String mimeType = Files.probeContentType(Paths.get(filePath));
        return "data:" + mimeType + ";base64," + base64String;
    }

    public static ImageGenerationResult waitTask(String taskId)
            throws ApiException, NoApiKeyException {
        ImageGeneration imageGeneration = new ImageGeneration();
        return imageGeneration.wait(taskId, apiKey);
    }

    public static void asyncCall() throws ApiException, NoApiKeyException, UploadFileException, IOException {
        /*
         * Description of image input methods (for image-to-image set generation scenarios):
         * The following three image input methods are provided. You can choose one of them.
         * 1. Use a public URL - suitable for publicly accessible images.
         * 2. Use a local file - suitable for local development and testing.
         * 3. Use Base64 encoding - suitable for private images or scenarios that require encrypted transmission.
         */
        // [Method 1] Use a public image URL
        // String image1 = "https://img.alicdn.com/imgextra/i4/O1CN01IM44WN23dq5uY1yla_!!6000000007279-49-tps-1024-1024.webp";

        // [Method 2] Use a local file (supports absolute and relative paths)
        // Format: file:// + file path
        // String image1 = "file:///path/to/your/image.png";

        // [Method 3] Use a Base64-encoded image
        // String image1 = encodeFile("/path/to/your/image.png");

        // Build the text input message (supports text-to-image set and image-to-image set generation. This example uses text-to-image set generation.)
        ImageGenerationMessage message = ImageGenerationMessage.builder()
                .role("user")
                .content(Collections.singletonList(
                        Collections.singletonMap("text", "A cinematic image set documenting the same stray orange cat. Its features must be consistent across all images. Image 1: In spring, the orange cat weaves through blooming cherry blossom trees. Image 2: In summer, the orange cat cools off in the shade of a tree on an old street. Image 3: In autumn, the orange cat steps on a carpet of golden fallen leaves. Image 4: In winter, the orange cat leaves footprints as it walks on the snow.")
                )).build();
        // For image-to-image set generation scenarios: uncomment the following code and comment out the plain text construction above.
        // ImageGenerationMessage message = ImageGenerationMessage.builder()
        //         .role("user")
        //         .content(Arrays.asList(
        //                 Collections.singletonMap("text", "Generate an image set of the four seasons based on the style of the reference image."),
        //                 Collections.singletonMap("image", image1)
        //         )).build();

        ImageGenerationParam param = ImageGenerationParam.builder()
                .apiKey(apiKey)
                .model("wan2.7-image-pro")
                .messages(Collections.singletonList(message))
                .enableSequential(true)
                .n(4)
                .size("2K") // The wan2.7-image-pro model supports 4K resolution only for text-to-image generation. Image editing and image set generation support a maximum resolution of 2K.
                .build();

        ImageGeneration imageGeneration = new ImageGeneration();
        ImageGenerationResult taskResult = null;
        try {
            System.out.println("----async call, creating task----");
            taskResult = imageGeneration.asyncCall(param);
        } catch (ApiException | NoApiKeyException | UploadFileException e) {
            throw new RuntimeException(e.getMessage());
        }
        System.out.println("Task created: " + JsonUtils.toJson(taskResult));

        // Wait for the task to complete.
        String taskId = taskResult.getOutput().getTaskId();
        ImageGenerationResult result = waitTask(taskId);
        // Fetch the resulting image URLs and save them to a local directory.
        for (int i = 0; i < result.getOutput().getChoices().size(); i++) {
            List<Map<String, Object>> contents = result.getOutput().getChoices().get(i)
                    .getMessage().getContent();
            for (int j = 0; j < contents.size(); j++) {
                if ("image".equals(contents.get(j).get("type"))) {
                    String imageUrl = (String) contents.get(j).get("image");
                    String fileName = "output_" + i + "_" + j + ".png";
                    // The result URL is valid for 24 hours. Download the image in a timely manner.
                    try (InputStream in = new URL(imageUrl).openStream()) {
                        Files.copy(in, Paths.get(fileName), StandardCopyOption.REPLACE_EXISTING);
                    }
                    System.out.println("Image saved to " + fileName);
                }
            }
        }
    }

    public static void main(String[] args) throws ApiException, NoApiKeyException, UploadFileException, IOException {
        asyncCall();
    }
}
```

##### Response example

1.  Response example for creating a task
    
    ```
    {
        "requestId": "7d026dc1-e8c9-9caa-84ac-e82e2da97xxx",
        "output": {
            "task_id": "2de18c56-c151-4b80-8105-1d164733exxx",
            "task_status": "PENDING"
        },
        "status_code": 200,
        "code": "",
        "message": ""
    }
    ```
    
2.  Response example for querying a task result
    
    > The URL is valid for 24 hours. Save it promptly.
    
    ```
    {
        "requestId": "daea7295-4ce0-928a-9a11-4d2bea058xxx",
        "usage": {
            "input_tokens": 720,
            "output_tokens": 11,
            "total_tokens": 731,
            "image_count": 4,
            "size": "2048*2048"
        },
        "output": {
            "choices": [
                {
                    "finish_reason": "stop",
                    "message": {
                        "role": "assistant",
                        "content": [
                            {
                                "image": "https://dashscope-result-bj.oss-cn-beijing.aliyuncs.com/xxxxxx.png?Expires=xxxxxx",
                                "type": "image"
                            },
                            {
                                "image": "https://dashscope-result-bj.oss-cn-beijing.aliyuncs.com/xxxxxx.png?Expires=xxxxxx",
                                "type": "image"
                            },
                            {
                                "image": "https://dashscope-result-bj.oss-cn-beijing.aliyuncs.com/xxxxxx.png?Expires=xxxxxx",
                                "type": "image"
                            },
                            {
                                "image": "https://dashscope-result-bj.oss-cn-beijing.aliyuncs.com/xxxxxx.png?Expires=xxxxxx",
                                "type": "image"
                            }
                        ]
                    }
                }
            ],
            "task_id": "2de18c56-c151-4b80-8105-1d164733exxx",
            "task_status": "SUCCEEDED",
            "finished": true,
            "submit_time": "2026-03-31 19:49:53.124",
            "scheduled_time": "2026-03-31 19:49:53.175",
            "end_time": "2026-03-31 19:50:53.160"
        },
        "status_code": 200,
        "code": "",
        "message": ""
    }
    ```
    

## **Billing and rate limiting**

-   For the model's free quota and unit price, see [Model pricing](/help/en/model-studio/model-pricing#e2540d71a2utl).
    
-   For model rate limiting, see [Wanxiang](/help/en/model-studio/rate-limit#513e0a3df24v7).
    
-   Billing details: You are billed based on the **number of images** successfully generated. Failed calls and processing errors do not incur charges or consume your [free quota for new users](/help/en/model-studio/new-free-quota).
    

## **Error codes**

If the model call fails and returns an error message, see [Error codes](/help/en/model-studio/error-code) for resolution.

/\* Adjust table width \*/ .aliyun-docs-content table.medium-width { max-width: 1018px; width: 100%; } .aliyun-docs-content table.table-no-border tr td:first-child { padding-left: 0; } .aliyun-docs-content table.table-no-border tr td:last-child { padding-right: 0; } /\* Support sticky positioning \*/ div:has(.aliyun-docs-content), .aliyun-docs-content .markdown-body { overflow: visible; } .stick-top { position: sticky; top: 46px; } /\*\* Code block font \*\*/ /\* Reduce code block margin in tables to make table information more compact \*/ .unionContainer .markdown-body table .help-code-block { margin: 0 !important; } /\* Reduce code block font size in tables to make table information more compact \*/ .unionContainer .markdown-body .help-code-block pre { font-size: 12px !important; } /\* Reduce code block font size in tables to make table information more compact \*/ .unionContainer .markdown-body .help-code-block pre code { font-size: 12px !important; } /\*\* API Reference tables \*\*/ .aliyun-docs-content table.api-reference tr td:first-child { margin: 0px; border-bottom: 1px solid #d8d8d8; } .aliyun-docs-content table.api-reference tr:last-child td:first-child { border-bottom: none; } .aliyun-docs-content table.api-reference p { color: #6e6e80; } .aliyun-docs-content table.api-reference b, i { color: #181818; } .aliyun-docs-content table.api-reference .collapse { border: none; margin-top: 4px; margin-bottom: 4px; } .aliyun-docs-content table.api-reference .collapse .expandable-title-bold { padding: 0; } .aliyun-docs-content table.api-reference .collapse .expandable-title { padding: 0; } .aliyun-docs-content table.api-reference .collapse .expandable-title-bold .title { margin-left: 16px; } .aliyun-docs-content table.api-reference .collapse .expandable-title .title { margin-left: 16px; } .aliyun-docs-content table.api-reference .collapse .expandable-title-bold i.icon { position: absolute; color: #777; font-weight: 100; } .aliyun-docs-content table.api-reference .collapse .expandable-title i.icon { position: absolute; color: #777; font-weight: 100; } .aliyun-docs-content table.api-reference .collapse.expanded .expandable-content { padding: 10px 14px 10px 14px !important; margin: 0; border: 1px solid #e9e9e9; } .aliyun-docs-content table.api-reference .collapse .expandable-title-bold b { font-size: 13px; font-weight: normal; color: #6e6e80; } .aliyun-docs-content table.api-reference .collapse .expandable-title b { font-size: 13px; font-weight: normal; color: #6e6e80; } .aliyun-docs-content table.api-reference .tabbed-content-box { border: none; } .aliyun-docs-content table.api-reference .tabbed-content-box section { padding: 8px 0 !important; } .aliyun-docs-content table.api-reference .tabbed-content-box.mini .tab-box { /\* position: absolute; left: 40px; right: 0; \*/ } .aliyun-docs-content .margin-top-33 { margin-top: 33px !important; } .aliyun-docs-content .two-codeblocks pre { max-height: calc(50vh - 136px) !important; height: auto; } .expandable-content section { border-bottom: 1px solid #e9e9e9; padding-top: 6px; padding-bottom: 4px; } .expandable-content section:last-child { border-bottom: none; } .expandable-content section:first-child { padding-top: 0; }