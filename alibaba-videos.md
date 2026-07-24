Generate physically realistic, motion-smooth video from text prompts with the HappyHorse model.

## Availability

The model, endpoint URL, and API key must belong to the **same region**. Cross-region calls fail.

-   [**Select a model**](https://modelstudio.console.alibabacloud.com/ap-southeast-1?tab=doc#/doc/?type=model&url=2840914): Check which region the model belongs to.
    
-   **Select a URL**: Use the region's endpoint URL. HTTP is supported.
    
-   **Configure an API key**: Get an [API key](/help/en/model-studio/get-api-key) for the region, and then [Export API key as environment variable](/help/en/model-studio/configure-api-key-through-environment-variables).
    

**Note**

The sample code in this topic applies to the **Singapore region**.

**Important**

Alibaba Cloud Model Studio has released workspace-specific domains for the China (Beijing) and Singapore regions. **The new dedicated domains deliver superior performance and higher stability for inference requests**. We recommend migrating to the new domains:

-   China (Beijing): from `https://dashscope.aliyuncs.com` to `https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com`
    
-   Singapore: from `https://dashscope-intl.aliyuncs.com` to `https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com`
    

`{WorkspaceId}` is your workspace ID, which can be found on the **Workspace Details** page in the Alibaba Cloud Model Studio console. The existing domain remains fully functional.

## HTTP request

Text-to-video tasks typically take 1 to 5 minutes. The API uses asynchronous calls with two steps: **"Create a task → Poll for results"**.

### **Step 1: Create a task and get the task ID**

## **Singapore**

`POST https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis`

## **US (Virginia)**

`POST https://dashscope-us.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis`

## **China (Beijing)**

`POST https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis`

## **Germany (Frankfurt)**

`POST https://{WorkspaceId}.eu-central-1.maas.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis`

## **China (Hong Kong)**

`POST https://{WorkspaceId}.cn-hongkong.maas.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis`

## **Japan (Tokyo)**

`POST https://{WorkspaceId}.ap-northeast-1.maas.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis`

Replace `{WorkspaceId}` with your actual [workspace ID](/help/en/model-studio/obtain-the-app-id-and-workspace-id#d3eb3cd37b7fu).

**Note**

-   After the task is created, use the returned `task_id` to query the result. The `task_id` is valid for 24 hours. **Do not create duplicate tasks**. Instead, use polling to retrieve the result.
    
-   For guidance for beginners, see [Call APIs with Postman or cURL](/help/en/model-studio/first-call-to-image-and-video-api).
    

| #### Request parameters | ## Text-to-video ``` # The following URL is for the Singapore region. When calling, replace {WorkspaceId} with your actual workspace ID. URLs vary by region. curl --location 'https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis' \\ -H 'X-DashScope-Async: enable' \\ -H "Authorization: Bearer $DASHSCOPE_API_KEY" \\ -H 'Content-Type: application/json' \\ -d '{ "model": "happyhorse-1.1-t2v", "input": { "prompt": "A miniature city built from cardboard and bottle caps comes to life at night. A cardboard train slowly passes through, with small lights dotting the scene and illuminating the way ahead." }, "parameters": { "resolution": "720P", "ratio": "16:9", "duration": 5 } }' ``` |
| --- | --- |
| **Content-Type** `*string*` **(Required)** The content type of the request. Must be `application/json`. |
| **Authorization** `*string*` **(Required)** Authenticates the request with a Model Studio API key. Example: Bearer sk-xxxx. |
| **X-DashScope-Async** `*string*` **(Required)** Enables asynchronous processing. HTTP requests support only asynchronous calls. Must be `enable`. **Important** If this request header is missing, the error "current user api does not support synchronous calls" is returned. |
| ##### Request body |
| **model** `*string*` **(Required)** The model name. For available models, see the [Model Studio console](https://modelstudio.console.alibabacloud.com/ap-southeast-1?tab=doc#/doc/?type=model&url=2840914). Example: `happyhorse-1.1-t2v`. |
| **input** `*object*` **(Required)** Model input. **Properties** **prompt** `*string*` **(Required)** Text description of the video to generate. Supports any language. Maximum 5,000 non-Chinese characters or 2,500 Chinese characters. Excess is truncated. |
| **parameters** `*object*` (Optional) Video output settings (resolution, aspect ratio, duration). **Properties** **resolution** `*string*` (Optional) Output video resolution. Valid values: - `720P` - `1080P` (default) **ratio** `*string*` (Optional) Output video aspect ratio. Valid values: - `16:9` (default) - `9:16` - `1:1` - `4:3` - `3:4` - `4:5` - `5:4` - `9:21` - `21:9` **duration** `*integer*` (Optional) Output video duration in seconds. - happyhorse-1.0-t2v: 3–15. Default: `5`. **watermark** `*boolean*` (Optional) Whether to add a watermark. Displays "HappyHorse" in the lower-right corner. - `true` (default) - `false` **seed** `*integer*` (Optional) The random number seed must be an integer in the range `[0, 2147483647]`. If not specified, a random seed is generated. A fixed seed improves reproducibility. Because model generation is probabilistic, the same seed does not guarantee identical results. |     |

| #### Response parameters | ### Successful response Save the `task_id` to query the task status and result. ``` { "output": { "task_status": "PENDING", "task_id": "0385dc79-5ff8-4d82-bcb6-xxxxxx" }, "request_id": "4909100c-7b5a-9f92-bfe5-xxxxxx" } ``` ### Error response Task creation failed. See [Error codes](/help/en/model-studio/error-code). ``` { "code": "InvalidApiKey", "message": "No API-key provided.", "request_id": "7438d53d-6eb8-4596-8835-xxxxxx" } ``` |
| --- | --- |
| **output** `*object*` Task output information. Properties **task\\_id** `*string*` The task ID. Valid for queries for 24 hours. **task\\_status** `*string*` The status of the task. **Enumeration values** - PENDING - RUNNING - SUCCEEDED - FAILED - CANCELED - UNKNOWN: The task does not exist or its status is unknown. |
| **request\\_id** `*string*` Unique request identifier for tracing and troubleshooting. |
| **code** `*string*` Error code. Returned only for failed requests. See [Error codes](/help/en/model-studio/error-code). |
| **message** `*string*` Detailed error message. Returned only for failed requests. See [Error codes](/help/en/model-studio/error-code). |

### **Step 2: Query the result by task ID**

## **Singapore**

`GET https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/tasks/{task_id}`

## **US (Virginia)**

`GET https://dashscope-us.aliyuncs.com/api/v1/tasks/{task_id}`

## **China (Beijing)**

`GET https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api/v1/tasks/{task_id}`

## **Germany (Frankfurt)**

`GET https://{WorkspaceId}.eu-central-1.maas.aliyuncs.com/api/v1/tasks/{task_id}`

## **China (Hong Kong)**

`GET https://{WorkspaceId}.cn-hongkong.maas.aliyuncs.com/api/v1/tasks/{task_id}`

## **Japan (Tokyo)**

`GET https://{WorkspaceId}.ap-northeast-1.maas.aliyuncs.com/api/v1/tasks/{task_id}`

**Note**

-   **Polling recommendation**: Video generation takes several minutes. Use a polling mechanism with a reasonable interval, such as 15 seconds.
    
-   **Task state transition**: PENDING → RUNNING → SUCCEEDED or FAILED.
    
-   **Result link**: After a task succeeds, a video URL valid for **24 hours** is returned. Download and save the video to permanent storage, such as [OSS](/help/en/oss/user-guide/what-is-oss).
    
-   `**task_id**` **validity**: **24 hours**. After this period, queries return the task status as `UNKNOWN`.
    

| #### Request parameters | ## Query task result Replace `{task_id}` with the `task_id` value returned by the previous API call. The `task_id` is valid for queries for 24 hours, Replace `{WorkspaceId}` with your actual [workspace ID](/help/en/model-studio/obtain-the-app-id-and-workspace-id#d3eb3cd37b7fu). ``` curl -X GET https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/tasks/{task_id} \\ --header "Authorization: Bearer $DASHSCOPE_API_KEY" ``` |
| --- | --- |
| ##### **Headers** |
| **Authorization** `*string*` **(Required)** Authenticates the request with a Model Studio API key. Example: Bearer sk-xxxx. |
| ##### **Path parameters** |
| **task\\_id** `*string*` **(Required)** The ID of the task. |

| #### **Response parameters** | ## Task succeeded Video URLs are valid for only 24 hours and then automatically purged. Save generated videos promptly. ``` { "request_id": "99243b47-ec5f-9413-9993-xxxxxx", "output": { "task_id": "4673458e-28be-4a05-bf2a-xxxxxx", "task_status": "SUCCEEDED", "submit_time": "2026-04-20 17:55:17.075", "scheduled_time": "2026-04-20 17:55:17.129", "end_time": "2026-04-20 17:56:36.658", "orig_prompt": "A miniature city built from cardboard and bottle caps comes to life at night. A cardboard train slowly passes through, with small lights dotting the scene and illuminating the way ahead.", "video_url": "https://dashscope-result.oss-cn-beijing.aliyuncs.com/xxx.mp4?Expires=xxx" }, "usage": { "duration": 5, "input_video_duration": 0, "output_video_duration": 5, "video_count": 1, "SR": 720, "ratio": "16:9" } } ``` ## Task failed When a task fails, `task_status` is FAILED with an error code and message. See [Error codes](/help/en/model-studio/error-code). ``` { "request_id": "e5d70b02-ebd3-98ce-9fe8-759d7d7b107d", "output": { "task_id": "86ecf553-d340-4e21-af6e-a0c6a421c010", "task_status": "FAILED", "code": "InvalidParameter", "message": "The parameter is invalid." } } ``` ## Task query expired The `task_id` is valid for 24 hours. After this period, queries return the following error. ``` { "request_id": "a4de7c32-7057-9f82-8581-xxxxxx", "output": { "task_id": "502a00b1-19d9-4839-a82f-xxxxxx", "task_status": "UNKNOWN" } } ``` |
| --- | --- |
| **output** `*object*` Task output information. **Properties** **task\\_id** `*string*` The task ID. Valid for queries for 24 hours. **task\\_status** `*string*` The status of the task. **Enumeration values** - PENDING - RUNNING - SUCCEEDED - FAILED - CANCELED - UNKNOWN: The task does not exist or its status is unknown. **State transitions during polling:** - PENDING → RUNNING → SUCCEEDED or FAILED. - The initial query status is usually PENDING or RUNNING. - When the status changes to SUCCEEDED, the response contains the generated video URL. - If the status is FAILED, check the error message and retry the task. **submit\\_time** `*string*` The time when the task was submitted. The time is in UTC+8 and the format is YYYY-MM-DD HH:mm:ss.SSS. **scheduled\\_time** `*string*` The time when the task was executed. The time is in UTC+8 and the format is YYYY-MM-DD HH:mm:ss.SSS. **end\\_time** `*string*` The time when the task was completed. The time is in UTC+8 and the format is YYYY-MM-DD HH:mm:ss.SSS. **video\\_url** `*string*` URL of the generated video. Returned only when `task_status` is SUCCEEDED. Valid for 24 hours. The video is in MP4 format with H.264 encoding. **orig\\_prompt** `*string*` The original input prompt, corresponding to the request parameter `prompt`. **code** `*string*` Error code. Returned only for failed requests. See [Error codes](/help/en/model-studio/error-code). **message** `*string*` Detailed error message. Returned only for failed requests. See [Error codes](/help/en/model-studio/error-code). |
| **usage** `*object*` Output statistics. Only successful tasks are counted. **Properties** **input\\_video\\_duration** `*integer*` Input video duration in seconds. **output\\_video\\_duration** `*integer*` Output video duration in seconds. **duration** `*integer*` Total video duration for billing. **SR** `*integer*` Output video resolution. **ratio** `*string*` Output video aspect ratio. **video\\_count** `*integer*` Number of output videos. Always 1. |
| **request\\_id** `*string*` Unique request identifier for tracing and troubleshooting. |

## **Error codes**

Failed API calls return error codes documented in [Error messages](/help/en/model-studio/error-code).

/\* Adjust table width \*/ .aliyun-docs-content table.medium-width { max-width: 1018px; width: 100%; } .aliyun-docs-content table.table-no-border tr td:first-child { padding-left: 0; } .aliyun-docs-content table.table-no-border tr td:last-child { padding-right: 0; } /\* Support sticky positioning \*/ div:has(.aliyun-docs-content), .aliyun-docs-content .markdown-body { overflow: visible; } .stick-top { position: sticky; top: 46px; } /\*\* Code block font \*\*/ /\* Reduce code block margin in tables to make table information more compact \*/ .unionContainer .markdown-body table .help-code-block { margin: 0 !important; } /\* Reduce code block font size in tables to make table information more compact \*/ .unionContainer .markdown-body .help-code-block pre { font-size: 12px !important; } /\* Reduce code block font size in tables to make table information more compact \*/ .unionContainer .markdown-body .help-code-block pre code { font-size: 12px !important; } /\*\* API Reference tables \*\*/ .aliyun-docs-content table.api-reference tr td:first-child { margin: 0px; border-bottom: 1px solid #d8d8d8; } .aliyun-docs-content table.api-reference tr:last-child td:first-child { border-bottom: none; } .aliyun-docs-content table.api-reference p { color: #6e6e80; } .aliyun-docs-content table.api-reference b, i { color: #181818; } .aliyun-docs-content table.api-reference .collapse { border: none; margin-top: 4px; margin-bottom: 4px; } .aliyun-docs-content table.api-reference .collapse .expandable-title-bold { padding: 0; } .aliyun-docs-content table.api-reference .collapse .expandable-title { padding: 0; } .aliyun-docs-content table.api-reference .collapse .expandable-title-bold .title { margin-left: 16px; } .aliyun-docs-content table.api-reference .collapse .expandable-title .title { margin-left: 16px; } .aliyun-docs-content table.api-reference .collapse .expandable-title-bold i.icon { position: absolute; color: #777; font-weight: 100; } .aliyun-docs-content table.api-reference .collapse .expandable-title i.icon { position: absolute; color: #777; font-weight: 100; } .aliyun-docs-content table.api-reference .collapse.expanded .expandable-content { padding: 10px 14px 10px 14px !important; margin: 0; border: 1px solid #e9e9e9; } .aliyun-docs-content table.api-reference .collapse .expandable-title-bold b { font-size: 13px; font-weight: normal; color: #6e6e80; } .aliyun-docs-content table.api-reference .collapse .expandable-title b { font-size: 13px; font-weight: normal; color: #6e6e80; } .aliyun-docs-content table.api-reference .tabbed-content-box { border: none; } .aliyun-docs-content table.api-reference .tabbed-content-box section { padding: 8px 0 !important; } .aliyun-docs-content table.api-reference .tabbed-content-box.mini .tab-box { /\* position: absolute; left: 40px; right: 0; \*/ } .aliyun-docs-content .margin-top-33 { margin-top: 33px !important; } .aliyun-docs-content .two-codeblocks pre { max-height: calc(50vh - 136px) !important; height: auto; } .expandable-content section { border-bottom: 1px solid #e9e9e9; padding-top: 6px; padding-bottom: 4px; } .expandable-content section:last-child { border-bottom: none; } .expandable-content section:first-child { padding-top: 0; }

/\* 让表格显示成类似钉钉文档的分栏卡片 \*/ table.help-table-card td { border: 10px solid #FFF !important; background: #F4F6F9; padding: 16px !important; vertical-align: top; } /\* 减少表格中的代码块 margin，让表格信息显示更紧凑 \*/ .unionContainer .markdown-body table .help-code-block { margin: 0 !important; } /\* 减少表格中的代码块字号，让表格信息显示更紧凑 \*/ .unionContainer .markdown-body .help-code-block pre { font-size: 12px !important; } /\* 减少表格中的代码块字号，让表格信息显示更紧凑 \*/ .unionContainer .markdown-body .help-code-block pre code { font-size: 12px !important; } /\* 表格中的引用上下间距调小，避免内容显示过于稀疏 \*/ .unionContainer .markdown-body table blockquote { margin: 4px 0 0 0; }

/\* ========================================= \*/ /\* 新增样式：带边框的表格 (api-table-border) \*/ /\* ========================================= \*/ /\* 1. 表格容器核心设置 \*/ .aliyun-docs-content table.api-table-border { border: 1px solid #d8d8d8 !important; /\* 表格外边框 \*/ border-collapse: collapse !important; /\* 合并边框，防止双线 \*/ width: 100% !important; /\* 宽度占满 \*/ margin: 10px 0 !important; /\* 上下间距 \*/ background-color: #fff !important; /\* 背景色 \*/ box-sizing: border-box !important; } /\* 2. 表头、表体、行设置 \*/ /\* 确保行本身没有干扰边框 \*/ .aliyun-docs-content table.api-table-border thead, .aliyun-docs-content table.api-table-border tbody, .aliyun-docs-content table.api-table-border tr { border: none !important; background-color: transparent !important; } /\* 3. 单元格设置 (th 和 td) \*/ /\* 这是边框显示的关键位置 \*/ .aliyun-docs-content table.api-table-border th, .aliyun-docs-content table.api-table-border td { border: 1px solid #d8d8d8 !important; /\* 单元格四周边框 \*/ padding: 8px 12px !important; /\* 内边距 \*/ text-align: left !important; /\* 文字左对齐 \*/ vertical-align: middle !important; /\* 垂直居中 \*/ color: #6e6e80 !important; /\* 文字颜色 \*/ font-size: 14px !important; /\* 字体大小 \*/ line-height: 1.5 !important; } /\* 4. 表头特殊样式 \*/ .aliyun-docs-content table.api-table-border th { background-color: #f9fafb !important; /\* 表头背景色 \*/ color: #181818 !important; /\* 表头文字颜色 \*/ font-weight: 600 !important; /\* 表头加粗 \*/ } /\* 5. 鼠标悬停效果 (可选) \*/ .aliyun-docs-content table.api-table-border tbody tr:hover td { background-color: #fcfcfc !important; /\* 悬停时背景微变 \*/ } /\* 6. 兼容原有 api-reference 可能存在的冲突 \*/ /\* 如果原有样式针对 td:first-child 等特殊选择器有干扰，这里强制覆盖 \*/ .aliyun-docs-content table.api-table-border tr td:first-child { border-bottom: 1px solid #d8d8d8 !important; margin: 0 !important; } .aliyun-docs-content table.api-table-border tr:last-child td:first-child { border-bottom: 1px solid #d8d8d8 !important; /\* 保持底部边框 \*/ }


Generate realistic, smooth-motion videos from a first-frame image and an optional text prompt using the HappyHorse model.

## Usage notes

The model, endpoint URL, and API key must belong to the **same region**. Cross-region calls fail.

-   [**Select a model**](https://modelstudio.console.alibabacloud.com/ap-southeast-1?tab=doc#/doc/?type=model&url=2840914): Check which region the model belongs to.
    
-   **Select a URL**: Select the endpoint URL for the same region.
    
-   **Configure an API key**: Get an [API key](/help/en/model-studio/get-api-key) for the same region, and then [configure the API key as an environment variable](/help/en/model-studio/configure-api-key-through-environment-variables).
    

**Note**

The sample code in this topic applies to the **Singapore** region.

**Important**

Alibaba Cloud Model Studio has released workspace-specific domains for the China (Beijing) and Singapore regions. **The new dedicated domains deliver superior performance and higher stability for inference requests**. We recommend migrating to the new domains:

-   China (Beijing): from `https://dashscope.aliyuncs.com` to `https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com`
    
-   Singapore: from `https://dashscope-intl.aliyuncs.com` to `https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com`
    

`{WorkspaceId}` is your workspace ID, which can be found on the **Workspace Details** page in the Alibaba Cloud Model Studio console. The existing domain remains fully functional.

## HTTP calls

Image-to-video tasks take 1–5 minutes. The API uses asynchronous calls: **"Create a task → poll for the result"**.

### **Step 1: Create a task**

## **Singapore**

`POST https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis`

## **US (Virginia)**

`POST https://dashscope-us.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis`

## **China (Beijing)**

`POST https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis`

## **Germany (Frankfurt)**

`POST https://{WorkspaceId}.eu-central-1.maas.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis`

## **China (Hong Kong)**

`POST https://{WorkspaceId}.cn-hongkong.maas.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis`

## **Japan (Tokyo)**

`POST https://{WorkspaceId}.ap-northeast-1.maas.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis`

Replace `{WorkspaceId}` with your actual [workspace ID](/help/en/model-studio/obtain-the-app-id-and-workspace-id#d3eb3cd37b7fu).

**Note**

-   After the task is created, use the returned `task_id` to query the result. The `task_id` is valid for 24 hours. **Do not create duplicate tasks**. Instead, use polling to retrieve the result.
    
-   For guidance for beginners, see [Call APIs with Postman or cURL](/help/en/model-studio/first-call-to-image-and-video-api).
    

| #### Request parameters | ## Image-to-video ``` # The following URLs are for the Singapore region. Replace {WorkspaceId} with your Bailian workspace ID. URLs vary by region. curl --location 'https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis' \\ -H 'X-DashScope-Async: enable' \\ -H "Authorization: Bearer $DASHSCOPE_API_KEY" \\ -H 'Content-Type: application/json' \\ -d '{ "model": "happyhorse-1.1-i2v", "input": { "prompt": "A cat running on the grass", "media": [ { "type": "first_frame", "url": "https://cdn.translate.alibaba.com/r/wanx-demo-1.png" } ] }, "parameters": { "resolution": "720P", "duration": 5 } }' ``` |
| --- | --- |
| **Content-Type** `*string*` **(Required)** The content type of the request. Must be `application/json`. |
| **Authorization** `*string*` **(Required)** Authenticates the request with a Model Studio API key. Example: Bearer sk-xxxx. |
| **X-DashScope-Async** `*string*` **(Required)** Enables asynchronous processing. HTTP requests support only asynchronous calls. Must be `enable`. **Important** If this request header is missing, the error "current user api does not support synchronous calls" is returned. |
| ##### Request body |
| **model** `*string*` **(required)** The model name. For available models, see the [Model Studio console](https://modelstudio.console.alibabacloud.com/ap-southeast-1?tab=doc#/doc/?type=model&url=2840914). Example: `happyhorse-1.1-i2v`. |
| **input** `*object*` **(required)** Model input, including the text prompt. **Properties** **prompt** `*string*` (optional) Describes the video content to generate. Supports any language. Maximum: 5,000 non-Chinese characters or 2,500 Chinese characters. Longer input is truncated. **media** `*array*` **(required)** The input image array. **media\\[\\] element properties** **type** `*string*` **(required)** The type of media. Allowed value: - `first_frame`: The first frame. Exactly one first-frame image is required. **url** `*string*` **(required)** The URL of the media. Input image (type=first\\_frame) The URL or Base64-encoded data of the first frame image. Image constraints: - Formats: JPEG, JPG, PNG, WEBP. - Resolution: Width and height must both be at least 300 pixels. - Aspect ratio: Between 1:2.5 and 2.5:1. - File size: Up to 20 MB. Supported input formats: 1. Public URL: - HTTP and HTTPS are supported. - Example: https://xxx/xxx.png. 2. Base64-encoded image string: - Format: `data:{MIME_type};base64,{base64_data}`. - Example: data:image/png;base64,GDU7MtCZzEbTbmRZ...... (truncated for display). **Base64 encoding format** Format: `data:{MIME_type};base64,{base64_data}` . - {base64\\_data}: The Base64-encoded string of the image file. - {MIME\\_type}: The media type of the image, which must match the file format. \\| Image format \\| MIME Type \\| \\| --- \\| --- \\| \\| JPEG \\| image/jpeg \\| \\| JPG \\| image/jpeg \\| \\| PNG \\| image/png \\| \\| WEBP \\| image/webp \\| |
| **parameters** `*object*` (optional) Video output settings such as resolution and duration. **Properties** **resolution** `*string*` (optional) The resolution of the generated video. Output pixel count approximates the selected tier while preserving the input image's aspect ratio. Allowed values: - `720P` - `1080P` (Default) **duration** `*integer*` (optional) The duration of the generated video, in seconds. The value must be an integer in the range \\[3, 15\\]. Default: `5`. **watermark** `*boolean*` (optional) Adds a "Happy Horse" text watermark to the bottom-right corner. - `true` (Default) - `false` **seed** `*integer*` (Optional) The random number seed must be an integer in the range `[0, 2147483647]`. If not specified, a random seed is generated. A fixed seed improves reproducibility. Because model generation is probabilistic, the same seed does not guarantee identical results. |

| #### Response parameters | ### Successful response Save the `task_id` to query the task status and result. ``` { "output": { "task_status": "PENDING", "task_id": "0385dc79-5ff8-4d82-bcb6-xxxxxx" }, "request_id": "4909100c-7b5a-9f92-bfe5-xxxxxx" } ``` ### Error response Task creation failed. See [Error codes](/help/en/model-studio/error-code). ``` { "code": "InvalidApiKey", "message": "No API-key provided.", "request_id": "7438d53d-6eb8-4596-8835-xxxxxx" } ``` |
| --- | --- |
| **output** `*object*` The task's output. Properties **task\\_id** `*string*` The task ID. Valid for queries for 24 hours. **task\\_status** `*string*` The status of the task. **Enumeration values** - PENDING - RUNNING - SUCCEEDED - FAILED - CANCELED - UNKNOWN: The task does not exist or its status is unknown. |
| **request\\_id** `*string*` Unique request identifier for tracing and troubleshooting. |
| **code** `*string*` Error code. Returned only for failed requests. See [Error codes](/help/en/model-studio/error-code). |
| **message** `*string*` Detailed error message. Returned only for failed requests. See [Error codes](/help/en/model-studio/error-code). |

### **Step 2: Poll for the result**

## **Singapore**

`GET https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/tasks/{task_id}`

## **US (Virginia)**

`GET https://dashscope-us.aliyuncs.com/api/v1/tasks/{task_id}`

## **China (Beijing)**

`GET https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api/v1/tasks/{task_id}`

## **Germany (Frankfurt)**

`GET https://{WorkspaceId}.eu-central-1.maas.aliyuncs.com/api/v1/tasks/{task_id}`

## **China (Hong Kong)**

`GET https://{WorkspaceId}.cn-hongkong.maas.aliyuncs.com/api/v1/tasks/{task_id}`

## **Japan (Tokyo)**

`GET https://{WorkspaceId}.ap-northeast-1.maas.aliyuncs.com/api/v1/tasks/{task_id}`

**Note**

-   **Polling recommendation**: Video generation takes several minutes. Use a polling mechanism with a reasonable interval, such as 15 seconds.
    
-   **Task state transition**: PENDING → RUNNING → SUCCEEDED or FAILED.
    
-   **Result link**: After a task succeeds, a video URL valid for **24 hours** is returned. Download and save the video to permanent storage, such as [OSS](/help/en/oss/user-guide/what-is-oss).
    
-   `**task_id**` **validity**: **24 hours**. After this period, queries return the task status as `UNKNOWN`.
    

| #### Request parameters | ## Query task result Replace `{task_id}` with the `task_id` value returned by the previous API call. The `task_id` is valid for queries for 24 hours, Replace `{WorkspaceId}` with your actual [workspace ID](/help/en/model-studio/obtain-the-app-id-and-workspace-id#d3eb3cd37b7fu). ``` curl -X GET https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/tasks/{task_id} \\ --header "Authorization: Bearer $DASHSCOPE_API_KEY" ``` |
| --- | --- |
| ##### **Request headers** |
| **Authorization** `*string*` **(Required)** Authenticates the request with a Model Studio API key. Example: Bearer sk-xxxx. |
| ##### **Path parameters** |
| **task\\_id** `*string*` **(Required)** The ID of the task. |

| #### **Response parameters** | ## Task successful Video URLs are valid for only 24 hours and then automatically purged. Save generated videos promptly. ``` { "request_id": "8ae698ba-df2d-966c-abcf-xxxxxx", "output": { "task_id": "e56d806f-76f9-4037-aefa-xxxxxx", "task_status": "SUCCEEDED", "submit_time": "2026-04-20 19:33:50.425", "scheduled_time": "2026-04-20 19:33:50.463", "end_time": "2026-04-20 19:35:34.216", "orig_prompt": "A cat running on the grass", "video_url": "https://dashscope-result.oss-cn-beijing.aliyuncs.com/xxx.mp4?Expires=xxx" }, "usage": { "duration": 5, "input_video_duration": 0, "output_video_duration": 5, "video_count": 1, "SR": 720 } } ``` ## Task failed When a task fails, `task_status` is FAILED with an error code and message. See [Error codes](/help/en/model-studio/error-code). ``` { "request_id": "e5d70b02-ebd3-98ce-9fe8-759d7d7b107d", "output": { "task_id": "86ecf553-d340-4e21-af6e-a0c6a421c010", "task_status": "FAILED", "code": "InvalidParameter", "message": "The parameter is invalid." } } ``` ## Task query expired The `task_id` is valid for 24 hours. After this period, queries return the following error. ``` { "request_id": "a4de7c32-7057-9f82-8581-xxxxxx", "output": { "task_id": "502a00b1-19d9-4839-a82f-xxxxxx", "task_status": "UNKNOWN" } } ``` |
| --- | --- |
| **output** `*object*` The task's output. **Properties** **task\\_id** `*string*` The task ID. Valid for queries for 24 hours. **task\\_status** `*string*` The status of the task. **Enumeration values** - PENDING - RUNNING - SUCCEEDED - FAILED - CANCELED - UNKNOWN: The task does not exist or its status is unknown. **State transitions during polling:** - PENDING → RUNNING → SUCCEEDED or FAILED. - The initial query status is usually PENDING or RUNNING. - When the status changes to SUCCEEDED, the response contains the generated video URL. - If the status is FAILED, check the error message and retry the task. **submit\\_time** `*string*` The time when the task was submitted. The time is in UTC+8 and the format is YYYY-MM-DD HH:mm:ss.SSS. **scheduled\\_time** `*string*` The time when the task was executed. The time is in UTC+8 and the format is YYYY-MM-DD HH:mm:ss.SSS. **end\\_time** `*string*` The time when the task was completed. The time is in UTC+8 and the format is YYYY-MM-DD HH:mm:ss.SSS. **video\\_url** `*string*` Returned only when `task_status` is `SUCCEEDED`. The URL is valid for 24 hours. Download the MP4 video (24 fps, H.264 encoded) from this URL. **orig\\_prompt** `*string*` The original input prompt, corresponding to the request parameter `prompt`. **code** `*string*` Error code. Returned only for failed requests. See [Error codes](/help/en/model-studio/error-code). **message** `*string*` Detailed error message. Returned only for failed requests. See [Error codes](/help/en/model-studio/error-code). |
| **usage** `*object*` Usage statistics. Calculated only for successful tasks. **Properties** **input\\_video\\_duration** `*integer*` The duration of the input video, in seconds. **output\\_video\\_duration** `*integer*` The duration of the output video, in seconds. **duration** `*integer*` The total video duration used for billing. **SR** `*integer*` The resolution of the output video. **video\\_count** `*integer*` The number of output videos. This value is always 1. |
| **request\\_id** `*string*` Unique request identifier for tracing and troubleshooting. |

## **Error codes**

If a call fails, check the [error messages](/help/en/model-studio/error-code) reference.

## FAQ

#### **Video aspect ratio**

Output aspect ratio matches the first frame. Unlike the [HappyHorse text-to-video](/help/en/model-studio/happyhorse-text-to-video-api-reference) model, image-to-video does not support the `ratio` parameter.

.table-wrapper { overflow: visible !important; } /\* Adjust table width \*/ .aliyun-docs-content table.medium-width { max-width: 1018px; width: 100%; } .aliyun-docs-content table.table-no-border tr td:first-child { padding-left: 0; } .aliyun-docs-content table.table-no-border tr td:last-child { padding-right: 0; } /\* Support sticky positioning \*/ div:has(.aliyun-docs-content), .aliyun-docs-content .markdown-body { overflow: visible; } .stick-top { position: sticky; top: 46px; } /\*\* Code block font \*\*/ /\* Reduce code block margin in tables to make table information more compact \*/ .unionContainer .markdown-body table .help-code-block { margin: 0 !important; } /\* Reduce code block font size in tables to make table information more compact \*/ .unionContainer .markdown-body .help-code-block pre { font-size: 12px !important; } /\* Reduce code block font size in tables to make table information more compact \*/ .unionContainer .markdown-body .help-code-block pre code { font-size: 12px !important; } /\*\* API Reference tables \*\*/ .aliyun-docs-content table.api-reference tr td:first-child { margin: 0px; border-bottom: 1px solid #d8d8d8; } .aliyun-docs-content table.api-reference tr:last-child td:first-child { border-bottom: none; } .aliyun-docs-content table.api-reference p { color: #6e6e80; } .aliyun-docs-content table.api-reference b, i { color: #181818; } .aliyun-docs-content table.api-reference .collapse { border: none; margin-top: 4px; margin-bottom: 4px; } .aliyun-docs-content table.api-reference .collapse .expandable-title-bold { padding: 0; } .aliyun-docs-content table.api-reference .collapse .expandable-title { padding: 0; } .aliyun-docs-content table.api-reference .collapse .expandable-title-bold .title { margin-left: 16px; } .aliyun-docs-content table.api-reference .collapse .expandable-title .title { margin-left: 16px; } .aliyun-docs-content table.api-reference .collapse .expandable-title-bold i.icon { position: absolute; color: #777; font-weight: 100; } .aliyun-docs-content table.api-reference .collapse .expandable-title i.icon { position: absolute; color: #777; font-weight: 100; } .aliyun-docs-content table.api-reference .collapse.expanded .expandable-content { padding: 10px 14px 10px 14px !important; margin: 0; border: 1px solid #e9e9e9; } .aliyun-docs-content table.api-reference .collapse .expandable-title-bold b { font-size: 13px; font-weight: normal; color: #6e6e80; } .aliyun-docs-content table.api-reference .collapse .expandable-title b { font-size: 13px; font-weight: normal; color: #6e6e80; } .aliyun-docs-content table.api-reference .tabbed-content-box { border: none; } .aliyun-docs-content table.api-reference .tabbed-content-box section { padding: 8px 0 !important; } .aliyun-docs-content table.api-reference .tabbed-content-box.mini .tab-box { /\* position: absolute; left: 40px; right: 0; \*/ } .aliyun-docs-content .margin-top-33 { margin-top: 33px !important; } .aliyun-docs-content .two-codeblocks pre { max-height: calc(50vh - 136px) !important; height: auto; } .expandable-content section { border-bottom: 1px solid #e9e9e9; padding-top: 6px; padding-bottom: 4px; } .expandable-content section:last-child { border-bottom: none; } .expandable-content section:first-child { padding-top: 0; }

/\* ========================================= \*/ /\* 新增样式：带边框的表格 (api-table-border) \*/ /\* ========================================= \*/ /\* 1. 表格容器核心设置 \*/ .aliyun-docs-content table.api-table-border { border: 1px solid #d8d8d8 !important; /\* 表格外边框 \*/ border-collapse: collapse !important; /\* 合并边框，防止双线 \*/ width: 100% !important; /\* 宽度占满 \*/ margin: 10px 0 !important; /\* 上下间距 \*/ background-color: #fff !important; /\* 背景色 \*/ box-sizing: border-box !important; } /\* 2. 表头、表体、行设置 \*/ /\* 确保行本身没有干扰边框 \*/ .aliyun-docs-content table.api-table-border thead, .aliyun-docs-content table.api-table-border tbody, .aliyun-docs-content table.api-table-border tr { border: none !important; background-color: transparent !important; } /\* 3. 单元格设置 (th 和 td) \*/ /\* 这是边框显示的关键位置 \*/ .aliyun-docs-content table.api-table-border th, .aliyun-docs-content table.api-table-border td { border: 1px solid #d8d8d8 !important; /\* 单元格四周边框 \*/ padding: 8px 12px !important; /\* 内边距 \*/ text-align: left !important; /\* 文字左对齐 \*/ vertical-align: middle !important; /\* 垂直居中 \*/ color: #6e6e80 !important; /\* 文字颜色 \*/ font-size: 14px !important; /\* 字体大小 \*/ line-height: 1.5 !important; } /\* 4. 表头特殊样式 \*/ .aliyun-docs-content table.api-table-border th { background-color: #f9fafb !important; /\* 表头背景色 \*/ color: #181818 !important; /\* 表头文字颜色 \*/ font-weight: 600 !important; /\* 表头加粗 \*/ } /\* 5. 鼠标悬停效果 (可选) \*/ .aliyun-docs-content table.api-table-border tbody tr:hover td { background-color: #fcfcfc !important; /\* 悬停时背景微变 \*/ } /\* 6. 兼容原有 api-reference 可能存在的冲突 \*/ /\* 如果原有样式针对 td:first-child 等特殊选择器有干扰，这里强制覆盖 \*/ .aliyun-docs-content table.api-table-border tr td:first-child { border-bottom: 1px solid #d8d8d8 !important; margin: 0 !important; } .aliyun-docs-content table.api-table-border tr:last-child td:first-child { border-bottom: 1px solid #d8d8d8 !important; /\* 保持底部边框 \*/ }


The HappyHorse reference-to-video model lets you provide **multiple reference images** and a **text prompt** to generate a video that combines subjects from the images into a scene based on the prompt.

## Usage notes

To ensure successful API calls, you must use a **model**, **endpoint URL**, and **API key** that all belong to the same **region**. Cross-region calls will fail.

-   [**Select a model**](https://modelstudio.console.alibabacloud.com/ap-southeast-1?tab=doc#/doc/?type=model&url=2840914): Confirm the region where your model is located.
    
-   **Select a URL**: Choose the corresponding endpoint URL. Both HTTP and DashScope SDK URLs are supported.
    
-   **Configure an API key**: Select a region, [get an API key](/help/en/model-studio/get-api-key), and then [configure the API key as an environment variable](/help/en/model-studio/configure-api-key-through-environment-variables).
    

**Note**

The sample code in this topic applies to the **Singapore** region.

**Important**

Alibaba Cloud Model Studio has released workspace-specific domains for the China (Beijing) and Singapore regions. **The new dedicated domains deliver superior performance and higher stability for inference requests**. We recommend migrating to the new domains:

-   China (Beijing): from `https://dashscope.aliyuncs.com` to `https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com`
    
-   Singapore: from `https://dashscope-intl.aliyuncs.com` to `https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com`
    

`{WorkspaceId}` is your workspace ID, which can be found on the **Workspace Details** page in the Alibaba Cloud Model Studio console. The existing domain remains fully functional.

## HTTP calls

Because reference-to-video tasks are time-consuming (typically 1–5 minutes), the API uses an asynchronous call. The workflow consists of two core steps: **"Create a task -> Poll for the result"**.

### **Step 1: Create a task**

## **Singapore**

`POST https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis`

## **US (Virginia)**

`POST https://dashscope-us.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis`

## **China (Beijing)**

`POST https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis`

## **Germany (Frankfurt)**

`POST https://{WorkspaceId}.eu-central-1.maas.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis`

## **China (Hong Kong)**

`POST https://{WorkspaceId}.cn-hongkong.maas.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis`

## **Japan (Tokyo)**

`POST https://{WorkspaceId}.ap-northeast-1.maas.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis`

Replace `{WorkspaceId}` with your actual [workspace ID](/help/en/model-studio/obtain-the-app-id-and-workspace-id#d3eb3cd37b7fu).

**Note**

-   After the task is created, use the returned `task_id` to query the result. The `task_id` is valid for 24 hours. **Do not create duplicate tasks**. Instead, use polling to retrieve the result.
    
-   For guidance for beginners, see [Call APIs with Postman or cURL](/help/en/model-studio/first-call-to-image-and-video-api).
    

| #### Request parameters | ## Reference-to-video (multi-image) ``` # The following URL is for the Singapore region. When calling, replace {WorkspaceId} with your actual workspace ID. URLs vary by region. curl --location 'https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis' \\ -H 'X-DashScope-Async: enable' \\ -H "Authorization: Bearer $DASHSCOPE_API_KEY" \\ -H 'Content-Type: application/json' \\ -d '{ "model": "happyhorse-1.1-r2v", "input": { "prompt": "A woman in a red qipao from [Image 1] is first shown in a profile medium shot, highlighting the tailored cut and S-curve of the dress. The camera then switches to a low-angle shot, capturing her unfolding the fan from [Image 2] while the tassel earrings from [Image 3] sway with her head movement. The scene ends with a close-up of her face, focusing on the charm in her eyes as her fingertips touch the fan, showcasing Eastern elegance from multiple angles.", "media": [ { "type": "reference_image", "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260424/mvzfud/hh-v2v-girl.jpg" }, { "type": "reference_image", "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260424/fvuihk/hh-v2v2-folding-fan.jpg" }, { "type": "reference_image", "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260424/imerii/hh-v2v-earrings.jpg" } ] }, "parameters": { "resolution": "720P", "ratio": "16:9", "duration": 5 } }' ``` |
| --- | --- |
| ##### Request headers |
| **Content-Type** `*string*` **(Required)** The content type of the request. Must be `application/json`. |
| **Authorization** `*string*` **(Required)** Authenticates the request with a Model Studio API key. Example: Bearer sk-xxxx. |
| **X-DashScope-Async** `*string*` **(Required)** Enables asynchronous processing. HTTP requests support only asynchronous calls. Must be `enable`. **Important** If this request header is missing, the error "current user api does not support synchronous calls" is returned. |
| ##### Request body |
| **model** `*string*` **(Required)** The model name. For available models, see the [Model Studio console](https://modelstudio.console.alibabacloud.com/ap-southeast-1?tab=doc#/doc/?type=model&url=2840914). Example: `happyhorse-1.1-r2v`. |
| **input** `*object*` **(Required)** The model input, which includes the reference images and text prompt. **Properties** **prompt** `*string*` **(Required)** A description of the desired elements and visual style for the generated video. Input in any language is supported. The length is limited to 5,000 non-Chinese characters or 2,500 Chinese characters. Content exceeding this limit is automatically truncated. **Image referencing**: In the prompt, use "**\\[Image 1\\]**" and "**\\[Image 2\\]**" to refer to the corresponding reference image in the `media` array. The order must be consistent with the order in the `media` array. When using a reference, specify the object in the image, such as "the woman in a red qipao in \\[Image 1\\]". **media** `*array*` **(Required)** A list of reference images. Each element in the array is a media object that contains `type` and `url` fields. - The order of elements in this array defines the order of subject references in the `prompt`. - The first `reference_image` in the array corresponds to **\\[Image 1\\]**, the second to **\\[Image 2\\]**, and so on. **Element properties** **type** `*string*` **(Required)** The type of media asset. Set this to: - `reference_image`: A reference image. Asset limits: - Number of reference images: 1 to 9. **url** `*string*` **(Required)** The URL or Base64-encoded data of a reference image. Image requirements: - Formats: JPEG, JPG, PNG, WEBP. - Resolution: The shortest side must be at least 400 pixels. A clear image with a resolution of 720P or higher is recommended. Avoid using images that are too small, blurry, or overly compressed, as this can degrade the output quality. - Maximum file size: 20 MB. Supported input formats: 1. Public URL: - Supports HTTP or HTTPS protocols. - Example: https://xxx/xxx.jpg. 2. Base64-encoded image string: - Data format: `data:{MIME_type};base64,{base64_data}`. - Example: data:image/png;base64,GDU7MtCZzEbTbmRZ...... (truncated for display purposes). **Base64-encoded data format** Format: `data:{MIME_type};base64,{base64_data}` . - {base64\\_data}: The Base64-encoded string of the image file. - {MIME\\_type}: The media type of the image, which must match the file format. \\| Image format \\| MIME Type \\| \\| --- \\| --- \\| \\| JPEG \\| image/jpeg \\| \\| JPG \\| image/jpeg \\| \\| PNG \\| image/png \\| \\| WEBP \\| image/webp \\| |
| **parameters** `*object*` (Optional) Parameters for video generation, such as video resolution, aspect ratio, and duration. **Properties** **resolution** `*string*` (Optional) The resolution tier of the generated video. Valid values: - `1080P`: Default value. - `720P` **ratio** `*string*` (Optional) The aspect ratio of the generated video. Valid values: - `16:9`: Default value. - `9:16` - `3:4` - `4:3` - `4:5` - `5:4` - `1:1` - `9:21` - `21:9` **duration** `*integer*` (Optional) The duration of the generated video, in seconds. Value range: An integer from `3` to `15`. Default value: `5`. **watermark** `*boolean*` (Optional) Specifies whether to add a watermark to the generated video. The watermark is placed in the bottom-right corner with the fixed text "Happy Horse". - `true`: Default value. A watermark is added. - `false`: No watermark is added. **seed** `*integer*` (Optional) The random number seed must be an integer in the range `[0, 2147483647]`. If not specified, a random seed is generated. A fixed seed improves reproducibility. Because model generation is probabilistic, the same seed does not guarantee identical results. |

| #### Response parameters | ### Successful response Save the `task_id` to query the task status and result. ``` { "output": { "task_status": "PENDING", "task_id": "0385dc79-5ff8-4d82-bcb6-xxxxxx" }, "request_id": "4909100c-7b5a-9f92-bfe5-xxxxxx" } ``` ### Error response Task creation failed. See [Error codes](/help/en/model-studio/error-code). ``` { "code": "InvalidApiKey", "message": "No API-key provided.", "request_id": "7438d53d-6eb8-4596-8835-xxxxxx" } ``` |
| --- | --- |
| **output** `*object*` The output information for the task. **Properties** **task\\_id** `*string*` The task ID. Valid for queries for 24 hours. **task\\_status** `*string*` The status of the task. **Enumeration values** - PENDING - RUNNING - SUCCEEDED - FAILED - CANCELED - UNKNOWN: The task does not exist or its status is unknown. |
| **request\\_id** `*string*` Unique request identifier for tracing and troubleshooting. |
| **code** `*string*` Error code. Returned only for failed requests. See [Error codes](/help/en/model-studio/error-code). |     |
| **message** `*string*` Detailed error message. Returned only for failed requests. See [Error codes](/help/en/model-studio/error-code). |     |

### **Step 2: Get the task result**

## **Singapore**

`GET https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/tasks/{task_id}`

## **US (Virginia)**

`GET https://dashscope-us.aliyuncs.com/api/v1/tasks/{task_id}`

## **China (Beijing)**

`GET https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api/v1/tasks/{task_id}`

## **Germany (Frankfurt)**

`GET https://{WorkspaceId}.eu-central-1.maas.aliyuncs.com/api/v1/tasks/{task_id}`

## **China (Hong Kong)**

`GET https://{WorkspaceId}.cn-hongkong.maas.aliyuncs.com/api/v1/tasks/{task_id}`

## **Japan (Tokyo)**

`GET https://{WorkspaceId}.ap-northeast-1.maas.aliyuncs.com/api/v1/tasks/{task_id}`

**Note**

-   **Polling recommendation**: Video generation can take several minutes. We recommend that you implement a **polling** mechanism with a reasonable query interval (for example, 15 seconds) to retrieve the result.
    
-   **Task status flow**: PENDING (Queued) → RUNNING (Processing) → SUCCEEDED (Succeeded) or FAILED (Failed).
    
-   **Task ID validity**: The **task ID** is valid for **24 hours**. After this period, you can no longer query the result, and the API returns a task status of `UNKNOWN`.
    

| #### Request parameters | ## Query task result Replace `{task_id}` with the `task_id` value returned by the previous API call. The `task_id` is valid for queries for 24 hours, Replace `{WorkspaceId}` with your actual [workspace ID](/help/en/model-studio/obtain-the-app-id-and-workspace-id#d3eb3cd37b7fu). ``` curl -X GET https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/tasks/{task_id} \\ --header "Authorization: Bearer $DASHSCOPE_API_KEY" ``` |
| --- | --- |
| ##### **Request headers** |
| **Authorization** `*string*` **(Required)** Authenticates the request with a Model Studio API key. Example: Bearer sk-xxxx. |
| ##### **URL path parameters** |
| **task\\_id** `*string*` **(Required)** The ID of the task. |

| #### **Response parameters** | #### **Task succeeded** Video URLs are valid for only 24 hours and then automatically purged. Save generated videos promptly. ``` { "request_id": "35137489-2862-96cb-b6f2-xxxxxx", "output": { "task_id": "1469cfc3-3004-4d9e-ab10-xxxxxx", "task_status": "SUCCEEDED", "submit_time": "2026-04-25 15:03:25.848", "scheduled_time": "2026-04-25 15:03:25.884", "end_time": "2026-04-25 15:04:05.882", "orig_prompt": "A woman in a red qipao from [Image 1] is first shown in a profile medium shot, highlighting the dress'\\''s tailored cut and S-curve. The camera then switches to a low-angle shot, capturing her unfolding the fan from [Image 2] while the tassel earrings from [Image 3] sway with her head movement. The scene ends with a close-up of her face, focusing on the charm in her eyes as her fingertips touch the fan, showcasing Eastern elegance from multiple angles.", "video_url": "https://dashscope-result-intl.oss-ap-southeast-1.aliyuncs.com/xxxx.mp4" }, "usage": { "duration": 5, "input_video_duration": 0, "output_video_duration": 5, "video_count": 1, "SR": 720, "ratio": "16:9" } } ``` ## Task failed When a task fails, `task_status` is FAILED with an error code and message. See [Error codes](/help/en/model-studio/error-code). ``` { "request_id": "e5d70b02-ebd3-98ce-9fe8-759d7d7b107d", "output": { "task_id": "86ecf553-d340-4e21-af6e-a0c6a421c010", "task_status": "FAILED", "code": "InvalidParameter", "message": "The resolution is not valid xxxxxx" } } ``` ## Task query expired The `task_id` is valid for 24 hours. After this period, queries return the following error. ``` { "request_id": "a4de7c32-7057-9f82-8581-xxxxxx", "output": { "task_id": "502a00b1-19d9-4839-a82f-xxxxxx", "task_status": "UNKNOWN" } } ``` |
| --- | --- |
| **output** `*object*` The output information for the task. **Properties** **task\\_id** `*string*` The task ID. Valid for queries for 24 hours. **task\\_status** `*string*` The status of the task. **Enumeration values** - PENDING - RUNNING - SUCCEEDED - FAILED - CANCELED - UNKNOWN: The task does not exist or its status is unknown. **State transitions during polling:** - PENDING → RUNNING → SUCCEEDED or FAILED. - The initial query status is usually PENDING or RUNNING. - When the status changes to SUCCEEDED, the response contains the generated video URL. - If the status is FAILED, check the error message and retry the task. **submit\\_time** `*string*` The time when the task was submitted. The time is in UTC+8 and the format is YYYY-MM-DD HH:mm:ss.SSS. **scheduled\\_time** `*string*` The time when the task was executed. The time is in UTC+8 and the format is YYYY-MM-DD HH:mm:ss.SSS. **end\\_time** `*string*` The time when the task was completed. The time is in UTC+8 and the format is YYYY-MM-DD HH:mm:ss.SSS. **video\\_url** `*string*` URL of the generated video. Returned only when `task_status` is SUCCEEDED. Valid for 24 hours. The video is in MP4 format with H.264 encoding. **orig\\_prompt** `*string*` The original input prompt, corresponding to the request parameter `prompt`. **code** `*string*` Error code. Returned only for failed requests. See [Error codes](/help/en/model-studio/error-code). **message** `*string*` Detailed error message. Returned only for failed requests. See [Error codes](/help/en/model-studio/error-code). |
| **usage** `*object*` Usage statistics for the task. You are only billed for successful tasks. **Properties** **duration** `*integer*` The billable duration of the generated video, in seconds. **input\\_video\\_duration** `*integer*` The total duration of the input video, in seconds. This is always 0 for reference-to-video tasks. **output\\_video\\_duration** `*integer*` The total duration of the output video, in seconds. **ratio** `*string*` The aspect ratio of the generated video. **SR** `*integer*` The resolution tier of the generated video. **video\\_count** `*integer*` The number of generated videos. This is always 1. |     |
| **request\\_id** `*string*` Unique request identifier for tracing and troubleshooting. |     |

## **Error codes**

If the model call fails and returns an error message, see [Error codes](/help/en/model-studio/error-code) for resolution.

.table-wrapper { overflow: visible !important; } /\* Adjust table width \*/ .aliyun-docs-content table.medium-width { max-width: 1018px; width: 100%; } .aliyun-docs-content table.table-no-border tr td:first-child { padding-left: 0; } .aliyun-docs-content table.table-no-border tr td:last-child { padding-right: 0; } /\* Support sticky positioning \*/ div:has(.aliyun-docs-content), .aliyun-docs-content .markdown-body { overflow: visible; } .stick-top { position: sticky; top: 46px; } /\*\* Code block font \*\*/ /\* Reduce code block margin in tables to make table information more compact \*/ .unionContainer .markdown-body table .help-code-block { margin: 0 !important; } /\* Reduce code block font size in tables to make table information more compact \*/ .unionContainer .markdown-body .help-code-block pre { font-size: 12px !important; } /\* Reduce code block font size in tables to make table information more compact \*/ .unionContainer .markdown-body .help-code-block pre code { font-size: 12px !important; } /\*\* API Reference tables \*\*/ .aliyun-docs-content table.api-reference tr td:first-child { margin: 0px; border-bottom: 1px solid #d8d8d8; } .aliyun-docs-content table.api-reference tr:last-child td:first-child { border-bottom: none; } .aliyun-docs-content table.api-reference p { color: #6e6e80; } .aliyun-docs-content table.api-reference b, i { color: #181818; } .aliyun-docs-content table.api-reference .collapse { border: none; margin-top: 4px; margin-bottom: 4px; } .aliyun-docs-content table.api-reference .collapse .expandable-title-bold { padding: 0; } .aliyun-docs-content table.api-reference .collapse .expandable-title { padding: 0; } .aliyun-docs-content table.api-reference .collapse .expandable-title-bold .title { margin-left: 16px; } .aliyun-docs-content table.api-reference .collapse .expandable-title .title { margin-left: 16px; } .aliyun-docs-content table.api-reference .collapse .expandable-title-bold i.icon { position: absolute; color: #777; font-weight: 100; } .aliyun-docs-content table.api-reference .collapse .expandable-title i.icon { position: absolute; color: #777; font-weight: 100; } .aliyun-docs-content table.api-reference .collapse.expanded .expandable-content { padding: 10px 14px 10px 14px !important; margin: 0; border: 1px solid #e9e9e9; } .aliyun-docs-content table.api-reference .collapse .expandable-title-bold b { font-size: 13px; font-weight: normal; color: #6e6e80; } .aliyun-docs-content table.api-reference .collapse .expandable-title b { font-size: 13px; font-weight: normal; color: #6e6e80; } .aliyun-docs-content table.api-reference .tabbed-content-box { border: none; } .aliyun-docs-content table.api-reference .tabbed-content-box section { padding: 8px 0 !important; } .aliyun-docs-content table.api-reference .tabbed-content-box.mini .tab-box { /\* position: absolute; left: 40px; right: 0; \*/ } .aliyun-docs-content .margin-top-33 { margin-top: 33px !important; } .aliyun-docs-content .two-codeblocks pre { max-height: calc(50vh - 136px) !important; height: auto; } .expandable-content section { border-bottom: 1px solid #e9e9e9; padding-top: 6px; padding-bottom: 4px; } .expandable-content section:last-child { border-bottom: none; } .expandable-content section:first-child { padding-top: 0; }

/\* ========================================= \*/ /\* 新增样式：带边框的表格 (api-table-border) \*/ /\* ========================================= \*/ /\* 1. 表格容器核心设置 \*/ .aliyun-docs-content table.api-table-border { border: 1px solid #d8d8d8 !important; /\* 表格外边框 \*/ border-collapse: collapse !important; /\* 合并边框，防止双线 \*/ width: 100% !important; /\* 宽度占满 \*/ margin: 10px 0 !important; /\* 上下间距 \*/ background-color: #fff !important; /\* 背景色 \*/ box-sizing: border-box !important; } /\* 2. 表头、表体、行设置 \*/ /\* 确保行本身没有干扰边框 \*/ .aliyun-docs-content table.api-table-border thead, .aliyun-docs-content table.api-table-border tbody, .aliyun-docs-content table.api-table-border tr { border: none !important; background-color: transparent !important; } /\* 3. 单元格设置 (th 和 td) \*/ /\* 这是边框显示的关键位置 \*/ .aliyun-docs-content table.api-table-border th, .aliyun-docs-content table.api-table-border td { border: 1px solid #d8d8d8 !important; /\* 单元格四周边框 \*/ padding: 8px 12px !important; /\* 内边距 \*/ text-align: left !important; /\* 文字左对齐 \*/ vertical-align: middle !important; /\* 垂直居中 \*/ color: #6e6e80 !important; /\* 文字颜色 \*/ font-size: 14px !important; /\* 字体大小 \*/ line-height: 1.5 !important; } /\* 4. 表头特殊样式 \*/ .aliyun-docs-content table.api-table-border th { background-color: #f9fafb !important; /\* 表头背景色 \*/ color: #181818 !important; /\* 表头文字颜色 \*/ font-weight: 600 !important; /\* 表头加粗 \*/ } /\* 5. 鼠标悬停效果 (可选) \*/ .aliyun-docs-content table.api-table-border tbody tr:hover td { background-color: #fcfcfc !important; /\* 悬停时背景微变 \*/ } /\* 6. 兼容原有 api-reference 可能存在的冲突 \*/ /\* 如果原有样式针对 td:first-child 等特殊选择器有干扰，这里强制覆盖 \*/ .aliyun-docs-content table.api-table-border tr td:first-child { border-bottom: 1px solid #d8d8d8 !important; margin: 0 !important; } .aliyun-docs-content table.api-table-border tr:last-child td:first-child { border-bottom: 1px solid #d8d8d8 !important; /\* 保持底部边框 \*/ }



The Wan 2.7 image-to-video model supports **multimodal input** (text, images, audio, and video) and performs three tasks: **first-frame-to-video, first-and-last-frame-to-video, and video continuation**.

**References**: [User guide](/help/en/model-studio/wan-image-to-video-guide)

**Note**

The new **image-to-video API** (wan2.7 model) supports all three tasks. The earlier [image-to-video from first frame](/help/en/model-studio/legacy-image-to-video-api-reference/) API (wan2.6 and earlier) supports only first-frame-to-video.

## Availability

The model, endpoint URL, and API key must belong to the same region. Cross-region calls fail.

-   [Select a model](/help/en/model-studio/use-video-generation#0754655d5ej0j): Verify that the model is available in your target region.
    
-   **Select a URL**: Choose the endpoint URL that matches your model's region. Both HTTP and DashScope SDK URLs are supported.
    
-   **Configure an API key**: Get an [API key](/help/en/model-studio/get-api-key) for the region, and then [configure the API key as an environment variable](/help/en/model-studio/configure-api-key-through-environment-variables).
    
-   **Install the SDK**: To make API calls with the SDK, [install the DashScope SDK](/help/en/model-studio/install-sdk).
    

**Note**

The sample code in this topic applies to the **Singapore** region.

**Important**

Alibaba Cloud Model Studio has released workspace-specific domains for the China (Beijing) and Singapore regions. **The new dedicated domains deliver superior performance and higher stability for inference requests**. We recommend migrating to the new domains:

-   China (Beijing): from `https://dashscope.aliyuncs.com` to `https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com`
    
-   Singapore: from `https://dashscope-intl.aliyuncs.com` to `https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com`
    

`{WorkspaceId}` is your workspace ID, which can be found on the **Workspace Details** page in the Alibaba Cloud Model Studio console. The existing domain remains fully functional.

## HTTP

**Important**

This API uses the **new image-to-video protocol** and supports only the **wan2.7 model**.

Image-to-video tasks typically take 1 to 5 minutes, so the API uses asynchronous invocation. The workflow has two steps: create a task, then **poll for the result**.

### **Step 1: Create a task and get the task ID**

## **Singapore**

`POST https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis`

## **Beijing**

`POST https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis`

Replace `{WorkspaceId}` with your actual [workspace ID](/help/en/model-studio/obtain-the-app-id-and-workspace-id#d3eb3cd37b7fu).

**Note**

-   After the task is created, use the returned `task_id` to query the result. The `task_id` is valid for 24 hours. **Do not create duplicate tasks**. Instead, use polling to retrieve the result.
    
-   For guidance for beginners, see [Call APIs with Postman or cURL](/help/en/model-studio/first-call-to-image-and-video-api).
    

| #### Request parameters | ## Video generation from the first frame Generate a video based on a first frame image and audio. ``` # The following URL is for the Singapore region. When calling, replace {WorkspaceId} with your actual workspace ID. URLs vary by region. curl --location 'https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis' \\ -H 'X-DashScope-Async: enable' \\ -H "Authorization: Bearer $DASHSCOPE_API_KEY" \\ -H 'Content-Type: application/json' \\ -d '{ "model": "wan2.7-i2v-2026-04-25", "input": { "prompt": "A scene of urban fantasy art. A dynamic graffiti art character. A boy made of spray paint comes to life on a concrete wall. He sings an English rap song at high speed while striking a classic, energetic rapper pose. The scene is set under an urban railway bridge at night. The light comes from a single street lamp, creating a cinematic atmosphere full of high energy and amazing detail. The audio of the video consists entirely of the rap, with no other dialogue or noise.", "media": [ { "type": "first_frame", "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20250925/wpimhv/rap.png" }, { "type": "driving_audio", "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20250925/ozwpvi/rap.mp3" } ] }, "parameters": { "resolution": "720P", "duration": 10, "prompt_extend": true, "watermark": true } }' ``` ## Video generation from the first and last frames Pass a first frame and a last frame to generate a video. ``` # The following URL is for the Singapore region. When calling, replace {WorkspaceId} with your actual workspace ID. URLs vary by region. curl --location 'https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis' \\ -H 'X-DashScope-Async: enable' \\ -H "Authorization: Bearer $DASHSCOPE_API_KEY" \\ -H 'Content-Type: application/json' \\ -d '{ "model": "wan2.7-i2v-2026-04-25", "input": { "prompt": "Realistic style, a small black cat looks up at the sky curiously. The camera angle gradually rises from eye level, finally capturing its curious gaze from a top-down view.", "media": [ { "type": "first_frame", "url": "https://wanx.alicdn.com/material/20250318/first_frame.png" }, { "type": "last_frame", "url": "https://wanx.alicdn.com/material/20250318/last_frame.png" } ] }, "parameters": { "resolution": "720P", "duration": 10, "prompt_extend": false, "watermark": true } }' ``` ## Video continuation Generate subsequent content based on an initial video clip. ``` # The following URL is for the Singapore region. When calling, replace {WorkspaceId} with your actual workspace ID. URLs vary by region. curl --location 'https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis' \\ -H 'X-DashScope-Async: enable' \\ -H "Authorization: Bearer $DASHSCOPE_API_KEY" \\ -H 'Content-Type: application/json' \\ -d '{ "model": "wan2.7-i2v-2026-04-25", "input": { "prompt": "A girl takes a selfie in the mirror, then leaves with her backpack.", "media": [ { "type": "first_clip", "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260129/hfugmr/wan-r2v-role1.mp4" } ] }, "parameters": { "resolution": "720P", "duration": 10, "prompt_extend": true, "watermark": true } }' ``` |
| --- | --- |
| **Content-Type** `*string*` **(Required)** The content type of the request. Must be `application/json`. |
| **Authorization** `*string*` **(Required)** Authenticates the request with a Model Studio API key. Example: Bearer sk-xxxx. |
| **X-DashScope-Async** `*string*` **(Required)** Enables asynchronous processing. HTTP requests support only asynchronous calls. Must be `enable`. **Important** If this request header is missing, the error "current user api does not support synchronous calls" is returned. |
| ##### Request body |
| **model** `*string*` **(Required)** The model name. For a list of models and their pricing, see [Model pricing](/help/en/model-studio/model-pricing#e715eca061ba4). Example: wan2.7-i2v-2026-04-25. |
| **input** `*object*` **(Required)** Basic input information, including the prompt. **Properties** **prompt** `*string*` (Optional) Text prompt that describes the elements and visual characteristics for the generated video. Chinese and English are supported. Up to 5,000 characters. Each Chinese character or letter counts as one character. Text that exceeds the limit is automatically truncated. Example: A kitten runs on the grass. For more information about how to use prompts, see [Text-to-video/image-to-video prompt guide](/help/en/model-studio/text-to-video-prompt). **negative\\_prompt** `*string*` (Optional) Describes content to exclude from the video. Chinese and English are supported. Maximum 500 characters. Text that exceeds the limit is automatically truncated. Example: low resolution, error, worst quality, low quality, deformed, extra fingers, bad proportions. **media** `*array*` **(Required)** Reference materials (images, audio, and video) for video generation. Each element is a media object with `type` and `url` fields. **Asset combinations** Only the following asset combinations are valid. Invalid combinations return an error. - **Video generation from the first frame**: - First frame: `first_frame` - First frame + audio: `first_frame+driving_audio` - **Video generation from the first and last frames**: - First frame + last frame: `first_frame+last_frame` - First frame + last frame + audio: `first_frame+last_frame+driving_audio` - **Video continuation**: - First video clip continuation: `first_clip` - First video clip + last frame continuation: `first_clip+last_frame` **Properties** **type** `*string*` **(Required)** The media asset type. Valid values: - `first_frame` - `last_frame` - `driving_audio` - `first_clip` Limit: Each `type` can appear at most once in the `media` array. For example, you cannot pass two `first_frame` assets. **url** `*string*` **(Required)** The URL of the media asset (image, audio, or video). Pass an image (type=first\\_frame or last\\_frame) URL or Base64-encoded data for the first or last frame image. Image limits: - Format: JPEG, JPG, PNG (alpha channel not supported), BMP, WEBP. - Resolution: The width and height must be in the range of \\[240, 8000\\] pixels. - Aspect ratio: 1:8 to 8:1. - File size: up to 20 MB. Supported input formats: 1. Public URL: - The HTTP or HTTPS protocol is supported. - Example: https://xxx/xxx.png. 2. A Base64-encoded image string: - Data format: `data:{MIME_type};base64,{base64_data}`. - Example: data:image/png;base64,GDU7MtCZzEbTbmRZ...... (The example is truncated for demonstration purposes). **Base64-encoded data format** Format: `data:{MIME_type};base64,{base64_data}` . - {base64\\_data}: The Base64-encoded string of the image file. - {MIME\\_type}: The Multipurpose Internet Mail Extensions (MIME) type of the image, which must correspond to the file format. Pass audio (type=driving\\_audio) URL of the audio file. - With audio: The model uses it as a driving source for lip-sync and action timing. - Without audio: The model automatically generates matching background music or sound effects. Audio limits: - Format: wav, mp3. - Duration: 2 s to 30 s. - File size: up to 15 MB. - Truncation: If the audio duration exceeds the `duration` value (for example, 5 s), the audio is automatically truncated to the first 5 seconds, and the rest is discarded. If the audio duration is shorter than the video duration, the portion of the video that exceeds the audio duration will be silent. For example, if the audio is 3 s long and the video is 5 s long, the first 3 seconds of the output video will have sound, and the last 2 seconds will be silent. Supported input formats: 1. Public URL: - The HTTP and HTTPS protocols are supported. - Example: https://xxx/xxx.mp3. Pass a video (type=first\\_clip) URL of the video file. The model generates a continuation based on the video content. The `duration` parameter controls the maximum total duration of the output. > For example, if duration=15 and the input video is 3 s long, the model generates a 12-s continuation. The final output video is 15 s long and is billed for 15 s. Video limits: - Format: mp4, mov. - Duration: 2 s to 10 s. - Resolution: The width and height must be in the range of \\[240, 4096\\] pixels. - Aspect ratio: 1:8 to 8:1. - File size: up to 100 MB. Supported input formats: 1. Public URL: - The HTTP and HTTPS protocols are supported. - Example: https://xxx/xxx.mp4. |
| **parameters** `*object*` (Optional) Video processing parameters: resolution, duration, prompt rewriting, and watermarks. **Properties** **resolution** `*string*` (Optional) **Important** Resolution directly affects cost. Before calling, check the [Model pricing](/help/en/model-studio/model-pricing#e715eca061ba4). Resolution tier for the generated video. Controls the total pixel count. The model automatically scales the video to a total pixel count close to the selected tier. **The output aspect ratio follows the input material (first frame or first video clip)**. For details, see [FAQ](#646b718e448ww). Valid values are 720P and 1080P. Default: `1080P`. **duration** `*integer*` (Optional) **Important** Duration directly affects cost. Billing is per second. Before calling, check the [Model pricing](/help/en/model-studio/model-pricing#e715eca061ba4). Duration of the generated video in seconds. Valid range depends on the model: Valid values: an integer from 2 to 15. Default: 5. **prompt\\_extend** `*boolean*` (Optional) Whether to enable prompt rewriting. When enabled, a model rewrites the input prompt to improve results for short prompts, but increases processing time. - `true` (default) - `false` **watermark** `*boolean*` (Optional) Whether to add an "AI Generated" watermark in the lower-right corner of the video. - `false` (default) - `true` **seed** `*integer*` (Optional) The random number seed must be an integer in the range `[0, 2147483647]`. If not specified, a random seed is generated. A fixed seed improves reproducibility. Because model generation is probabilistic, the same seed does not guarantee identical results. |

| #### Response parameters | ### Successful response Save the `task_id` to query the task status and result. ``` { "output": { "task_status": "PENDING", "task_id": "0385dc79-5ff8-4d82-bcb6-xxxxxx" }, "request_id": "4909100c-7b5a-9f92-bfe5-xxxxxx" } ``` ### Error response Task creation failed. See [Error codes](/help/en/model-studio/error-code). ``` { "code": "InvalidApiKey", "message": "No API-key provided.", "request_id": "7438d53d-6eb8-4596-8835-xxxxxx" } ``` |
| --- | --- |
| **output** `*object*` Task output information. Properties **task\\_id** `*string*` The task ID. Valid for queries for 24 hours. **task\\_status** `*string*` The status of the task. **Enumeration values** - PENDING - RUNNING - SUCCEEDED - FAILED - CANCELED - UNKNOWN: The task does not exist or its status is unknown. |
| **request\\_id** `*string*` Unique request identifier for tracing and troubleshooting. |
| **code** `*string*` Error code. Returned only for failed requests. See [Error codes](/help/en/model-studio/error-code). |
| **message** `*string*` Detailed error message. Returned only for failed requests. See [Error codes](/help/en/model-studio/error-code). |

### **Step 2: Query the result by task ID**

## **Singapore**

`GET https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/tasks/{task_id}`

## **Beijing**

`GET https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api/v1/tasks/{task_id}`

Replace `{WorkspaceId}` with your actual [workspace ID](/help/en/model-studio/obtain-the-app-id-and-workspace-id#d3eb3cd37b7fu).

**Note**

-   **Polling recommendation**: Video generation takes several minutes. Use a polling mechanism with a reasonable interval, such as 15 seconds.
    
-   **Task state transition**: PENDING → RUNNING → SUCCEEDED or FAILED.
    
-   **Result link**: After a task succeeds, a video URL valid for **24 hours** is returned. Download and save the video to permanent storage, such as [OSS](/help/en/oss/user-guide/what-is-oss).
    
-   `**task_id**` **validity**: **24 hours**. After this period, queries return the task status as `UNKNOWN`.
    

| #### Request parameters | ## Query task result Replace `{task_id}` with the `task_id` value returned by the previous API call. The `task_id` is valid for queries for 24 hours, Replace `{WorkspaceId}` with your actual [workspace ID](/help/en/model-studio/obtain-the-app-id-and-workspace-id#d3eb3cd37b7fu). ``` curl -X GET https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/tasks/{task_id} \\ --header "Authorization: Bearer $DASHSCOPE_API_KEY" ``` |
| --- | --- |
| ##### **Headers** |
| **Authorization** `*string*` **(Required)** Authenticates the request with a Model Studio API key. Example: Bearer sk-xxxx. |
| ##### **Path parameters** |
| **task\\_id** `*string*` **(Required)** The ID of the task. |

| #### **Response parameters** | ## Task successful Video URLs are valid for only 24 hours and then automatically purged. Save generated videos promptly. ``` { "request_id": "2ca1c497-f9e0-449d-9a3f-xxxxxx", "output": { "task_id": "af6efbc0-4bef-4194-8246-xxxxxx", "task_status": "SUCCEEDED", "submit_time": "2025-09-25 11:07:28.590", "scheduled_time": "2025-09-25 11:07:35.349", "end_time": "2025-09-25 11:17:11.650", "orig_prompt": "A scene of urban fantasy art. A dynamic graffiti art character. A boy made of spray paint comes to life on a concrete wall. He sings an English rap song at high speed while striking a classic, energetic rapper pose. The scene is set under an urban railway bridge at night. The light comes from a single street lamp, creating a cinematic atmosphere full of high energy and amazing detail. The audio of the video consists entirely of his rap, with no other dialogue or noise.", "video_url": "https://dashscope-result-sh.oss-cn-shanghai.aliyuncs.com/xxx.mp4?Expires=xxx" }, "usage": { "duration": 15, "input_video_duration": 0, "output_video_duration": 15, "video_count": 1, "SR": 720 } } ``` ## Task failed When a task fails, `task_status` is FAILED with an error code and message. See [Error codes](/help/en/model-studio/error-code). ``` { "request_id": "e5d70b02-ebd3-98ce-9fe8-759d7d7b107d", "output": { "task_id": "86ecf553-d340-4e21-af6e-a0c6a421c010", "task_status": "FAILED", "code": "InvalidParameter", "message": "The size is not match xxxxxx" } } ``` ## Task query expired The `task_id` is valid for 24 hours. After this period, queries return the following error. ``` { "request_id": "a4de7c32-7057-9f82-8581-xxxxxx", "output": { "task_id": "502a00b1-19d9-4839-a82f-xxxxxx", "task_status": "UNKNOWN" } } ``` |
| --- | --- |
| **output** `*object*` Task output information. **Properties** **task\\_id** `*string*` The task ID. Valid for queries for 24 hours. **task\\_status** `*string*` The status of the task. **Enumeration values** - PENDING - RUNNING - SUCCEEDED - FAILED - CANCELED - UNKNOWN: The task does not exist or its status is unknown. **State transitions during polling:** - PENDING → RUNNING → SUCCEEDED or FAILED. - The initial query status is usually PENDING or RUNNING. - When the status changes to SUCCEEDED, the response contains the generated video URL. - If the status is FAILED, check the error message and retry the task. **submit\\_time** `*string*` The time when the task was submitted. The time is in UTC+8 and the format is YYYY-MM-DD HH:mm:ss.SSS. **scheduled\\_time** `*string*` The time when the task was executed. The time is in UTC+8 and the format is YYYY-MM-DD HH:mm:ss.SSS. **end\\_time** `*string*` The time when the task was completed. The time is in UTC+8 and the format is YYYY-MM-DD HH:mm:ss.SSS. **video\\_url** `*string*` URL of the generated video. Returned only when `task_status` is SUCCEEDED. Valid for 24 hours. The video is in MP4 format with H.264 encoding. **orig\\_prompt** `*string*` The original input prompt, corresponding to the request parameter `prompt`. **code** `*string*` Error code. Returned only for failed requests. See [Error codes](/help/en/model-studio/error-code). **message** `*string*` Detailed error message. Returned only for failed requests. See [Error codes](/help/en/model-studio/error-code). |
| **usage** `*object*` Usage statistics. Calculated only for successful tasks. **Properties** **input\\_video\\_duration** `*integer*` Duration of the input video, in seconds. **output\\_video\\_duration** `*integer*` Duration of the output video, in seconds. **duration** `*integer*` Total video duration used for billing. **SR** `*integer*` Output video resolution. Example: 720. **video\\_count** `*integer*` Number of output videos. Fixed at 1. |
| **request\\_id** `*string*` Unique request identifier for tracing and troubleshooting. |

## DashScope SDK

The SDK parameter names match those in the [HTTP API](#9c71bffa84zm6). The parameter structure is encapsulated based on language conventions.

Image-to-video tasks typically take 1 to 5 minutes. The SDK encapsulates the HTTP asynchronous invocation process and supports both synchronous and asynchronous calls.

> Actual processing time depends on the task queue and service load. Wait for the result.

### Python SDK

**Important**

Make sure the DashScope Python SDK version is **not lower than** **1.25.16** before running the following code.

If the version is too old, errors such as "url error, please check url!" may occur. For more information, see [Install the SDK](/help/en/model-studio/install-sdk) to update it.

Set **dashscope.base\_http\_api\_url** based on the model's region:

## **Singapore**

`dashscope.base_http_api_url = 'https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1'`

## **Beijing**

`dashscope.base_http_api_url = 'https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api/v1'`

Replace `{WorkspaceId}` with your actual [workspace ID](/help/en/model-studio/obtain-the-app-id-and-workspace-id#d3eb3cd37b7fu).

## **Synchronous call**

##### Request example

```
# -*- coding: utf-8 -*-
from http import HTTPStatus
from dashscope import VideoSynthesis
import dashscope
import os

# The following URL is for the Singapore region. When calling, replace {WorkspaceId} with your actual workspace ID. URLs vary by region.
dashscope.base_http_api_url = 'https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1'

# If you have not configured the environment variable, replace the following line with: api_key="sk-xxx"
# API keys vary by region. For more information, see https://www.alibabacloud.com/help/en/model-studio/get-api-key
api_key = os.getenv("DASHSCOPE_API_KEY")

media = [
    {
        "type": "first_frame",
        "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20250925/wpimhv/rap.png"
    },
    {
        "type": "driving_audio",
        "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20250925/ozwpvi/rap.mp3"
    }
]

def sample_sync_call():
    print('----Synchronous call, please wait a moment----')
    rsp = VideoSynthesis.call(
        api_key=api_key,
        model="wan2.7-i2v-2026-04-25",
        media=media,
        resolution="720P",
        duration=10,
        watermark=True,
        prompt="An urban fantasy art scene featuring a dynamic graffiti character. A boy made of spray paint comes to life on a concrete wall. He sings an English rap song at high speed while striking a classic, energetic rapper pose. The scene is set under an urban railway bridge at night, lit by a single street lamp. This creates a cinematic atmosphere with high energy and amazing detail. The video's audio consists entirely of the rap, with no other dialogue or noise.",
    )
    if rsp.status_code == HTTPStatus.OK:
        print(rsp.output.video_url)
    else:
        print('Failed, status_code: %s, code: %s, message: %s' %
              (rsp.status_code, rsp.code, rsp.message))

if __name__ == '__main__':
    sample_sync_call()
```

##### Response example

> The video\_url is valid for 24 hours. Download the video promptly.

```
{
    "status_code": 200,
    "request_id": "ac5faf37-ddfa-9720-a0c5-xxxxxx",
    "code": null,
    "message": "",
    "output": {
        "task_id": "b97c6d86-ad73-4bb7-80ff-xxxxxx",
        "task_status": "SUCCEEDED",
        "video_url": "https://dashscope-a717.oss-accelerate.aliyuncs.com/xxx.mp4?Expires=xxx",
        "submit_time": "2026-04-13 10:45:47.597",
        "scheduled_time": "2026-04-13 10:45:56.342",
        "end_time": "2026-04-13 10:47:26.273",
        "orig_prompt": "An urban fantasy art scene. A dynamic graffiti character. A boy made of spray paint comes to life on a concrete wall. He performs a fast-paced English rap song while striking a classic, energetic rapper pose. The scene is set under an urban railway bridge at night. The light comes from a single street lamp, creating a cinematic atmosphere with high energy and incredible detail. The audio consists solely of the rap, with no other dialogue or background noise."
    },
    "usage": {
        "video_count": 1,
        "duration": 10,
        "input_video_duration": 0,
        "output_video_duration": 10,
        "SR": 720
    }
}
```

## **Asynchronous call**

##### Request example

```
# -*- coding: utf-8 -*-
from http import HTTPStatus
from dashscope import VideoSynthesis
import dashscope
import os

# The following URL is for the Singapore region. When calling, replace {WorkspaceId} with your actual workspace ID. URLs vary by region.
dashscope.base_http_api_url = 'https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1'

# If the environment variable is not set, replace the following line with: api_key="sk-xxx"
# API keys vary by region. To obtain an API key, see https://www.alibabacloud.com/help/en/model-studio/get-api-key
api_key = os.getenv("DASHSCOPE_API_KEY")

media = [
    {
        "type": "first_frame",
        "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20250925/wpimhv/rap.png"
    },
    {
        "type": "driving_audio",
        "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20250925/ozwpvi/rap.mp3"
    }
]

def sample_async_call():
    # Submit an asynchronous task. Information about the task is returned immediately.
    rsp = VideoSynthesis.async_call(
        api_key=api_key,
        model="wan2.7-i2v-2026-04-25",
        media=media,
        resolution="720P",
        duration=10,
        watermark=True,
        prompt="A scene of urban fantasy art. A dynamic graffiti art character. A boy made of spray paint comes to life on a concrete wall. He sings an English rap song at high speed while striking a classic, energetic rapper pose. The scene is set under an urban railway bridge at night. The light comes from a single street lamp, creating a cinematic atmosphere full of high energy and amazing detail. The audio of the video consists entirely of the rap, with no other dialogue or noise.",
    )
    print(rsp)
    if rsp.status_code == HTTPStatus.OK:
        print("task_id: %s" % rsp.output.task_id)
    else:
        print('Failed, status_code: %s, code: %s, message: %s' %
              (rsp.status_code, rsp.code, rsp.message))

    # Query the task status.
    status = VideoSynthesis.fetch(task=rsp, api_key=api_key)
    if status.status_code == HTTPStatus.OK:
        print(status.output.task_status)
    else:
        print('Failed, status_code: %s, code: %s, message: %s' %
              (status.status_code, status.code, status.message))

    # Wait for the task to complete.
    rsp = VideoSynthesis.wait(task=rsp, api_key=api_key)
    print(rsp)
    if rsp.status_code == HTTPStatus.OK:
        print(rsp.output.video_url)
    else:
        print('Failed, status_code: %s, code: %s, message: %s' %
              (rsp.status_code, rsp.code, rsp.message))

if __name__ == '__main__':
    sample_async_call()
```

##### **Response example**

1.  Response example for creating a task
    
    ```
    {
        "status_code": 200,
        "request_id": "6dc3bf6c-be18-9268-9c27-xxxxxx",
        "code": "",
        "message": "",
        "output": {
            "task_id": "686391d9-7ecf-4290-a8e9-xxxxxx",
            "task_status": "PENDING",
            "video_url": ""
        },
        "usage": null
    }
    ```
    
2.  Response example for querying a task result
    
    > The video\_url is valid for 24 hours. Download the video promptly.
    
    ```
    {
        "status_code": 200,
        "request_id": "ac5faf37-ddfa-9720-a0c5-xxxxxx",
        "code": null,
        "message": "",
        "output": {
            "task_id": "b97c6d86-ad73-4bb7-80ff-xxxxxx",
            "task_status": "SUCCEEDED",
            "video_url": "https://dashscope-a717.oss-accelerate.aliyuncs.com/xxx.mp4?Expires=xxx",
            "submit_time": "2026-04-13 10:45:47.597",
            "scheduled_time": "2026-04-13 10:45:56.342",
            "end_time": "2026-04-13 10:47:26.273",
            "orig_prompt": "An urban fantasy art scene. A dynamic graffiti character. A boy made of spray paint comes to life on a concrete wall. He performs a fast-paced English rap song while striking a classic, energetic rapper pose. The scene is set under an urban railway bridge at night. The light comes from a single street lamp, creating a cinematic atmosphere with high energy and incredible detail. The audio consists solely of the rap, with no other dialogue or background noise."
        },
        "usage": {
            "video_count": 1,
            "duration": 10,
            "input_video_duration": 0,
            "output_video_duration": 10,
            "SR": 720
        }
    }
    ```
    

### Java SDK

**Important**

Ensure that the DashScope Java SDK version is **not lower than** **2.22.14** before running the following code.

If the version is too old, errors such as "url error, please check url!" may occur. For more information, see [Install the SDK](/help/en/model-studio/install-sdk) to update it.

Set **Constants.baseHttpApiUrl** based on the model's region:

## **Singapore**

`Constants.baseHttpApiUrl = "https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1"`

## **Beijing**

`Constants.baseHttpApiUrl = "https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api/v1"`

Replace `{WorkspaceId}` with your actual [workspace ID](/help/en/model-studio/obtain-the-app-id-and-workspace-id#d3eb3cd37b7fu).

## **Synchronous call**

A synchronous call blocks until the video generation is complete and the result is returned.

##### Request example

```
// Copyright (c) Alibaba, Inc. and its affiliates.

import com.alibaba.dashscope.aigc.videosynthesis.VideoSynthesis;
import com.alibaba.dashscope.aigc.videosynthesis.VideoSynthesisParam;
import com.alibaba.dashscope.aigc.videosynthesis.VideoSynthesisResult;
import com.alibaba.dashscope.exception.ApiException;
import com.alibaba.dashscope.exception.InputRequiredException;
import com.alibaba.dashscope.exception.NoApiKeyException;
import com.alibaba.dashscope.utils.Constants;
import com.alibaba.dashscope.utils.JsonUtils;

import java.util.ArrayList;
import java.util.List;

public class Image2Video {

    static {
        // The following URL is for the Singapore region. When calling, replace {WorkspaceId} with your actual workspace ID. URLs vary by region.
        Constants.baseHttpApiUrl = "https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1";
    }

    // If the environment variable is not configured, replace the following line with: apiKey="sk-xxx"
    // API keys are region-specific. To obtain an API key, visit: https://www.alibabacloud.com/help/en/model-studio/get-api-key
    static String apiKey = System.getenv("DASHSCOPE_API_KEY");

    public static void syncCall() {
        VideoSynthesis videoSynthesis = new VideoSynthesis();
        final String prompt = "A scene of urban fantasy art. A dynamic graffiti art character. A boy made of spray paint comes to life on a concrete wall. He sings an English rap song at high speed while striking a classic, energetic rapper pose. The scene is set under an urban railway bridge at night. The light comes from a single street lamp, creating a cinematic atmosphere full of high energy and amazing detail. The audio of the video consists entirely of his rap, with no other dialogue or noise.";
        List<VideoSynthesisParam.Media> media = new ArrayList<VideoSynthesisParam.Media>(){{
            add(VideoSynthesisParam.Media.builder()
                    .url("https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20250925/wpimhv/rap.png")
                    .type("first_frame")
                    .build());
            add(VideoSynthesisParam.Media.builder()
                    .url("https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20250925/ozwpvi/rap.mp3")
                    .type("driving_audio")
                    .build());
        }};
        VideoSynthesisParam param =
                VideoSynthesisParam.builder()
                        .apiKey(apiKey)
                        .model("wan2.7-i2v-2026-04-25")
                        .prompt(prompt)
                        .media(media)
                        .watermark(true)
                        .duration(10)
                        .resolution("720P")
                        .build();
        VideoSynthesisResult result = null;
        try {
            System.out.println("---Sync call, please wait...----");
            result = videoSynthesis.call(param);
        } catch (ApiException | NoApiKeyException e){
            throw new RuntimeException(e.getMessage());
        } catch (InputRequiredException e) {
            throw new RuntimeException(e);
        }
        System.out.println(JsonUtils.toJson(result));
    }

    public static void main(String[] args) {
        syncCall();
    }
}
```

##### Response example

> The video\_url is valid for 24 hours. Download the video promptly.

```
{
    "request_id": "78178b55-8399-9823-8173-xxxxxx",
    "output": {
        "task_id": "be457e1b-8a79-47ed-aeff-xxxxxx",
        "task_status": "SUCCEEDED",
        "video_url": "https://dashscope-a717.oss-accelerate.aliyuncs.com/xxx.mp4?Expires=xxx",
        "orig_prompt": "An urban fantasy art scene featuring a dynamic graffiti art character. A boy made of spray paint comes to life on a concrete wall. He rapidly sings an English rap song while striking a classic, energetic rapper pose. The scene is set under an urban railway bridge at night. A single street lamp provides the light, creating a high-energy cinematic atmosphere with incredible detail. The audio consists entirely of his rap, with no other dialogue or background noise.",
        "submit_time": "2026-04-13 10:57:36.795",
        "scheduled_time": "2026-04-13 10:57:46.280",
        "end_time": "2026-04-13 10:59:16.338"
    },
    "usage": {
        "video_count": 1,
        "duration": 10,
        "input_video_duration": 0,
        "output_video_duration": 10,
        "SR": 720
    },
    "status_code": 200,
    "code": "",
    "message": ""
}
```

## **Asynchronous call**

##### Request example

```
// Copyright (c) Alibaba, Inc. and its affiliates.

import com.alibaba.dashscope.aigc.videosynthesis.VideoSynthesis;
import com.alibaba.dashscope.aigc.videosynthesis.VideoSynthesisParam;
import com.alibaba.dashscope.aigc.videosynthesis.VideoSynthesisResult;
import com.alibaba.dashscope.exception.ApiException;
import com.alibaba.dashscope.exception.InputRequiredException;
import com.alibaba.dashscope.exception.NoApiKeyException;
import com.alibaba.dashscope.utils.Constants;
import com.alibaba.dashscope.utils.JsonUtils;

import java.util.ArrayList;
import java.util.List;

public class Image2Video {

    static {
        // The following URL is for the Singapore region. When calling, replace {WorkspaceId} with your actual workspace ID. URLs vary by region.
        Constants.baseHttpApiUrl = "https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1";
    }

    // If the environment variable is not configured, replace the following line with: apiKey = "sk-xxx"
    // API keys are region-specific. To obtain an API key, see https://www.alibabacloud.com/help/en/model-studio/get-api-key
    static String apiKey = System.getenv("DASHSCOPE_API_KEY");

    public static void asyncCall() {
        VideoSynthesis videoSynthesis = new VideoSynthesis();
        final String prompt = "A scene of urban fantasy art. A dynamic graffiti art character. A boy made of spray paint comes to life on a concrete wall. He sings an English rap song at high speed while striking a classic, energetic rapper pose. The scene is set under an urban railway bridge at night. The light comes from a single street lamp, creating a cinematic atmosphere full of high energy and amazing detail. The audio of the video consists entirely of his rap, with no other dialogue or noise.";
        List<VideoSynthesisParam.Media> media = new ArrayList<VideoSynthesisParam.Media>(){{
            add(VideoSynthesisParam.Media.builder()
                    .url("https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20250925/wpimhv/rap.png")
                    .type("first_frame")
                    .build());
            add(VideoSynthesisParam.Media.builder()
                    .url("https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20250925/ozwpvi/rap.mp3")
                    .type("driving_audio")
                    .build());
        }};
        VideoSynthesisParam param =
                VideoSynthesisParam.builder()
                        .apiKey(apiKey)
                        .model("wan2.7-i2v-2026-04-25")
                        .prompt(prompt)
                        .media(media)
                        .watermark(true)
                        .duration(10)
                        .resolution("720P")
                        .build();
        VideoSynthesisResult result = null;
        try {
            System.out.println("--- Starting the asynchronous call. Please wait... ---");
            result = videoSynthesis.asyncCall(param);
        } catch (ApiException | NoApiKeyException e){
            throw new RuntimeException(e.getMessage());
        } catch (InputRequiredException e) {
            throw new RuntimeException(e);
        }
        System.out.println(JsonUtils.toJson(result));

        String taskId = result.getOutput().getTaskId();
        System.out.println("taskId=" + taskId);

        try {
            result = videoSynthesis.wait(taskId, apiKey);
        } catch (ApiException | NoApiKeyException e){
            throw new RuntimeException(e.getMessage());
        }
        System.out.println(JsonUtils.toJson(result));
        System.out.println(JsonUtils.toJson(result.getOutput()));
    }

    public static void main(String[] args) {
        asyncCall();
    }
}
```

##### Response example

1.  Response example for creating a task
    
    ```
    {
        "request_id": "5dbf9dc5-4f4c-9605-85ea-xxxxxxxx",
        "output": {
            "task_id": "7277e20e-aa01-4709-xxxxxxxx",
            "task_status": "PENDING"
        }
    }
    ```
    
2.  Response example for querying a task result
    
    > The video\_url is valid for 24 hours. Download the video promptly.
    
    ```
    {
        "request_id": "78178b55-8399-9823-8173-xxxxxx",
        "output": {
            "task_id": "be457e1b-8a79-47ed-aeff-xxxxxx",
            "task_status": "SUCCEEDED",
            "video_url": "https://dashscope-a717.oss-accelerate.aliyuncs.com/xxx.mp4?Expires=xxx",
            "orig_prompt": "An urban fantasy art scene featuring a dynamic graffiti art character. A boy made of spray paint comes to life on a concrete wall. He rapidly sings an English rap song while striking a classic, energetic rapper pose. The scene is set under an urban railway bridge at night. A single street lamp provides the light, creating a high-energy cinematic atmosphere with incredible detail. The audio consists entirely of his rap, with no other dialogue or background noise.",
            "submit_time": "2026-04-13 10:57:36.795",
            "scheduled_time": "2026-04-13 10:57:46.280",
            "end_time": "2026-04-13 10:59:16.338"
        },
        "usage": {
            "video_count": 1,
            "duration": 10,
            "input_video_duration": 0,
            "output_video_duration": 10,
            "SR": 720
        },
        "status_code": 200,
        "code": "",
        "message": ""
    }
    ```
    

## **Error codes**

If a model call fails and returns an error message, see [Error codes](/help/en/model-studio/error-code) to resolve the issue.

## **FAQ**

#### **Q: How do I generate a video with a specific aspect ratio, such as 3:4?**

A: The output aspect ratio is determined by the **input material (first frame image or first video clip)** but is **not guaranteed to match exactly**. A slight drift may occur.

The following example explains the logic using a first frame image as input:

-   **Why does drift occur?**
    
    -   Execution logic: The system uses the input image's aspect ratio as a baseline, combined with the target total pixels for the `resolution` tier. Because video encoding requires **width and height to be multiples of 16**, the system adjusts the output to the closest valid resolution.
        
    -   Calculation example: A 750 x 1000 pixel input image (3:4 ratio = 0.75) with "720P" resolution (~920,000 total pixels) produces an 816 x 1104 pixel output (ratio ~0.739, ~900,000 total pixels).
        
-   **Recommendations**:
    
    -   Input control: Use a first frame or video clip that matches your target aspect ratio.
        
    -   Post-processing: For strict aspect ratio requirements, crop the video or add black bars after generation.
        

#### **Q: How do I get the whitelist of domain names for video storage access?**

A: Videos generated by models are stored in OSS. The API returns a temporary public URL. **To configure a firewall whitelist for this download URL**, note the following: The underlying storage may change dynamically. This topic does not provide a fixed OSS domain name whitelist to prevent access issues caused by outdated information. If you have security control requirements, contact your account manager to obtain the latest OSS domain name list.

.table-wrapper { overflow: visible !important; } /\* Adjust table width \*/ .aliyun-docs-content table.medium-width { max-width: 1018px; width: 100%; } .aliyun-docs-content table.table-no-border tr td:first-child { padding-left: 0; } .aliyun-docs-content table.table-no-border tr td:last-child { padding-right: 0; } /\* Support sticky positioning \*/ div:has(.aliyun-docs-content), .aliyun-docs-content .markdown-body { overflow: visible; } .stick-top { position: sticky; top: 46px; } /\*\* Code block font \*\*/ /\* Reduce code block margin in tables to make table information more compact \*/ .unionContainer .markdown-body table .help-code-block { margin: 0 !important; } /\* Reduce code block font size in tables to make table information more compact \*/ .unionContainer .markdown-body .help-code-block pre { font-size: 12px !important; } /\* Reduce code block font size in tables to make table information more compact \*/ .unionContainer .markdown-body .help-code-block pre code { font-size: 12px !important; } /\*\* API Reference tables \*\*/ .aliyun-docs-content table.api-reference tr td:first-child { margin: 0px; border-bottom: 1px solid #d8d8d8; } .aliyun-docs-content table.api-reference tr:last-child td:first-child { border-bottom: none; } .aliyun-docs-content table.api-reference p { color: #6e6e80; } .aliyun-docs-content table.api-reference b, i { color: #181818; } .aliyun-docs-content table.api-reference .collapse { border: none; margin-top: 4px; margin-bottom: 4px; } .aliyun-docs-content table.api-reference .collapse .expandable-title-bold { padding: 0; } .aliyun-docs-content table.api-reference .collapse .expandable-title { padding: 0; } .aliyun-docs-content table.api-reference .collapse .expandable-title-bold .title { margin-left: 16px; } .aliyun-docs-content table.api-reference .collapse .expandable-title .title { margin-left: 16px; } .aliyun-docs-content table.api-reference .collapse .expandable-title-bold i.icon { position: absolute; color: #777; font-weight: 100; } .aliyun-docs-content table.api-reference .collapse .expandable-title i.icon { position: absolute; color: #777; font-weight: 100; } .aliyun-docs-content table.api-reference .collapse.expanded .expandable-content { padding: 10px 14px 10px 14px !important; margin: 0; border: 1px solid #e9e9e9; } .aliyun-docs-content table.api-reference .collapse .expandable-title-bold b { font-size: 13px; font-weight: normal; color: #6e6e80; } .aliyun-docs-content table.api-reference .collapse .expandable-title b { font-size: 13px; font-weight: normal; color: #6e6e80; } .aliyun-docs-content table.api-reference .tabbed-content-box { border: none; } .aliyun-docs-content table.api-reference .tabbed-content-box section { padding: 8px 0 !important; } .aliyun-docs-content table.api-reference .tabbed-content-box.mini .tab-box { /\* position: absolute; left: 40px; right: 0; \*/ } .aliyun-docs-content .margin-top-33 { margin-top: 33px !important; } .aliyun-docs-content .two-codeblocks pre { max-height: calc(50vh - 136px) !important; height: auto; } .expandable-content section { border-bottom: 1px solid #e9e9e9; padding-top: 6px; padding-bottom: 4px; } .expandable-content section:last-child { border-bottom: none; } .expandable-content section:first-child { padding-top: 0; }

/\* ========================================= \*/ /\* 新增样式：带边框的表格 (api-table-border) \*/ /\* ========================================= \*/ /\* 1. 表格容器核心设置 \*/ .aliyun-docs-content table.api-table-border { border: 1px solid #d8d8d8 !important; /\* 表格外边框 \*/ border-collapse: collapse !important; /\* 合并边框，防止双线 \*/ width: 100% !important; /\* 宽度占满 \*/ margin: 10px 0 !important; /\* 上下间距 \*/ background-color: #fff !important; /\* 背景色 \*/ box-sizing: border-box !important; } /\* 2. 表头、表体、行设置 \*/ /\* 确保行本身没有干扰边框 \*/ .aliyun-docs-content table.api-table-border thead, .aliyun-docs-content table.api-table-border tbody, .aliyun-docs-content table.api-table-border tr { border: none !important; background-color: transparent !important; } /\* 3. 单元格设置 (th 和 td) \*/ /\* 这是边框显示的关键位置 \*/ .aliyun-docs-content table.api-table-border th, .aliyun-docs-content table.api-table-border td { border: 1px solid #d8d8d8 !important; /\* 单元格四周边框 \*/ padding: 8px 12px !important; /\* 内边距 \*/ text-align: left !important; /\* 文字左对齐 \*/ vertical-align: middle !important; /\* 垂直居中 \*/ color: #6e6e80 !important; /\* 文字颜色 \*/ font-size: 14px !important; /\* 字体大小 \*/ line-height: 1.5 !important; } /\* 4. 表头特殊样式 \*/ .aliyun-docs-content table.api-table-border th { background-color: #f9fafb !important; /\* 表头背景色 \*/ color: #181818 !important; /\* 表头文字颜色 \*/ font-weight: 600 !important; /\* 表头加粗 \*/ } /\* 5. 鼠标悬停效果 (可选) \*/ .aliyun-docs-content table.api-table-border tbody tr:hover td { background-color: #fcfcfc !important; /\* 悬停时背景微变 \*/ } /\* 6. 兼容原有 api-reference 可能存在的冲突 \*/ /\* 如果原有样式针对 td:first-child 等特殊选择器有干扰，这里强制覆盖 \*/ .aliyun-docs-content table.api-table-border tr td:first-child { border-bottom: 1px solid #d8d8d8 !important; margin: 0 !important; } .aliyun-docs-content table.api-table-border tr:last-child td:first-child { border-bottom: 1px solid #d8d8d8 !important; /\* 保持底部边框 \*/ }

The Wan text-to-video model generates smooth videos from **text prompts**.

**References**: [User guide](/help/en/model-studio/text-to-video-guide)

## Availability

Match the region for your model, endpoint URL, and API key. Cross-region calls fail.

-   [Select a model](/help/en/model-studio/text-to-video-guide#06f39eafa2dwt): Verify model availability in your target region.
    
-   **Select a URL**: Use the endpoint URL for the corresponding region. HTTP and HTTPS are both supported.
    
-   **Configure an API key**: Select a region, [get an API key](/help/en/model-studio/get-api-key), and [configure it in environment variables](/help/en/model-studio/configure-api-key-through-environment-variables).
    
-   **Install the SDK**: To call the API through an SDK, [install the DashScope SDK](/help/en/model-studio/install-sdk).
    

**Note**

Sample code in this topic uses the **Singapore** region.

**Important**

Alibaba Cloud Model Studio has released workspace-specific domains for the China (Beijing) and Singapore regions. **The new dedicated domains deliver superior performance and higher stability for inference requests**. We recommend migrating to the new domains:

-   China (Beijing): from `https://dashscope.aliyuncs.com` to `https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com`
    
-   Singapore: from `https://dashscope-intl.aliyuncs.com` to `https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com`
    

`{WorkspaceId}` is your workspace ID, which can be found on the **Workspace Details** page in the Alibaba Cloud Model Studio console. The existing domain remains fully functional.

## HTTP (wan2.7)

**Important**

This interface uses the **new protocol** and supports only **wan2.7**.

Text-to-video tasks take 1–5 minutes. The API uses asynchronous invocation: **Create a task → Poll for the result**.

#### **Step 1: Create a task**

## **Beijing**

`POST https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis`

## **Singapore**

`POST https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis`

## **Singapore**

`POST https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis`

## **Beijing**

`POST https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis`

Replace `{WorkspaceId}` with your actual [workspace ID](/help/en/model-studio/obtain-the-app-id-and-workspace-id#d3eb3cd37b7fu).

**Note**

-   After the task is created, use the returned `task_id` to query the result. The `task_id` is valid for 24 hours. **Do not create duplicate tasks**. Instead, use polling to retrieve the result.
    
-   For guidance for beginners, see [Call APIs with Postman or cURL](/help/en/model-studio/first-call-to-image-and-video-api).
    

| #### Request parameters | ## Multi-shot narrative Control shot structure with natural language in the `prompt`. The `shot_type` parameter has no effect. - Single shot: Input "Generate a single-shot video". - Multi-shot: Input "Generate a multi-shot video" or describe shots with timestamps (e.g., "Shot 1 \\[0–3 seconds\\] wide shot: Rainy New York street at night"). - Default: If unspecified, the model interprets the `prompt` content. ``` curl --location 'https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis' \\ -H 'X-DashScope-Async: enable' \\ -H "Authorization: Bearer $DASHSCOPE_API_KEY" \\ -H 'Content-Type: application/json' \\ -d '{ "model": "wan2.7-t2v-2026-06-12", "input": { "prompt": "A tense detective story with cinematic storytelling. Shot 1 [0–3 seconds] wide shot: Rainy New York street at night, neon lights flicker, a detective in a black trench coat walks briskly. Shot 2 [3–6 seconds] medium shot: The detective enters an old building, rain wets his coat, the door closes slowly behind him. Shot 3 [6–9 seconds] close-up: The detective's focused eyes, distant sirens sound, he frowns slightly. Shot 4 [9–12 seconds] medium shot: The detective moves carefully down a dim hallway, his flashlight illuminating the way. Shot 5 [12–15 seconds] close-up: The detective discovers a key clue, his face shows sudden realization." }, "parameters": { "resolution": "720P", "ratio": "16:9", "prompt_extend": true, "watermark": true, "duration": 15 } }' ``` ## Provide an audio file Specify a custom audio file URL in the `input.audio_url` parameter. ``` curl --location 'https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis' \\ -H 'X-DashScope-Async: enable' \\ -H "Authorization: Bearer $DASHSCOPE_API_KEY" \\ -H 'Content-Type: application/json' \\ -d '{ "model": "wan2.7-t2v-2026-06-12", "input": { "prompt": "An epic and cute scene. A small, adorable cartoon kitten general, wearing exquisitely detailed golden armor and a slightly oversized helmet, stands bravely on a cliff. He rides a small but heroic warhorse and says: 'The long clouds of Qinghai darken the snowy mountains, a lone city gazes at Yumen Pass from afar. Through a hundred battles in the yellow sand, the golden armor is worn, but we will not return until we have broken Loulan'. Below the cliff, a vast and endless army of mice with makeshift weapons is charging forward. This is a dramatic, large-scale battle scene inspired by ancient Chinese war epics. In the distance, dark clouds gather in the sky over the snowy mountains. The overall atmosphere is a comical and epic fusion of 'cute' and 'domineering'.", "audio_url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20250923/hbiayh/%E4%BB%8E%E5%86%9B%E8%A1%8C.mp3" }, "parameters": { "resolution": "1080P", "ratio": "16:9", "prompt_extend": true, "duration": 10 } }' ``` ## Automatic dubbing Without `input.audio_url`, the model generates background music or sound effects that match the video content. ``` curl --location 'https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis' \\ -H 'X-DashScope-Async: enable' \\ -H "Authorization: Bearer $DASHSCOPE_API_KEY" \\ -H 'Content-Type: application/json' \\ -d '{ "model": "wan2.7-t2v-2026-06-12", "input": { "prompt": "An epic and cute scene. A small, adorable cartoon kitten general, wearing exquisitely detailed golden armor and a slightly oversized helmet, stands bravely on a cliff. He rides a small but heroic warhorse and says: 'The long clouds of Qinghai darken the snowy mountains, a lone city gazes at Yumen Pass from afar. Through a hundred battles in the yellow sand, the golden armor is worn, but we will not return until we have broken Loulan'. Below the cliff, a vast and endless army of mice with makeshift weapons is charging forward. This is a dramatic, large-scale battle scene inspired by ancient Chinese war epics. In the distance, dark clouds gather in the sky over the snowy mountains. The overall atmosphere is a comical and epic fusion of 'cute' and 'domineering'." }, "parameters": { "resolution": "720P", "ratio": "16:9", "prompt_extend": true, "duration": 10 } }' ``` ## Use a negative prompt Use negative\\_prompt to exclude the "flower" element and prevent it from appearing in the video. ``` curl --location 'https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis' \\ -H 'X-DashScope-Async: enable' \\ -H "Authorization: Bearer $DASHSCOPE_API_KEY" \\ -H 'Content-Type: application/json' \\ -d '{ "model": "wan2.7-t2v-2026-06-12", "input": { "prompt": "A kitten running in the moonlight", "negative_prompt": "flower" }, "parameters": { "resolution": "720P", "ratio": "16:9" } }' ``` |
| --- | --- |
| ##### Headers |
| **Content-Type** `*string*` **(Required)** The content type of the request. Must be `application/json`. |
| **Authorization** `*string*` **(Required)** Authenticates the request with a Model Studio API key. Example: Bearer sk-xxxx. |
| **X-DashScope-Async** `*string*` **(Required)** Enables asynchronous processing. HTTP requests support only asynchronous calls. Must be `enable`. **Important** If this request header is missing, the error "current user api does not support synchronous calls" is returned. |
| ##### Request body |
| **model** `*string*` **(Required)** Model name. For models and pricing, see [Model pricing](/help/en/model-studio/models#577af209dc0rc). Example: wan2.7-t2v, wan2.7-t2v-2026-06-12. |
| **input** `*object*` **(Required)** Input data, including the prompt. **Properties** **prompt** `*string*` **(Required)** Text prompt describing the video content and visual style. Supports Chinese and English. Each character or letter counts as one. Text beyond the limit is auto-truncated. Maximum length by model: - wan2.7-t2v, wan2.7-t2v-2026-06-12: Up to 5,000 characters. Example: A kitten running in the moonlight. For tips, see [Text-to-video/image-to-video prompt guide](/help/en/model-studio/text-to-video-prompt). **negative\\_prompt** `*string*` (Optional) Elements to exclude from the generated video. Supports Chinese and English. Maximum 500 characters; longer text is auto-truncated. Example: low resolution, error, worst quality, low quality, deformed, extra fingers, bad proportions. **audio\\_url** `*string*` (Optional) URL of the audio file for video generation. Supported formats: 1. Public URL: - HTTP and HTTPS protocols. - Example: https://help-static-aliyun-doc.aliyuncs.com/xxx.mp3. Audio limits: - Format: WAV, MP3. - Duration: 2–30 seconds. - File size: Up to 15 MB. - Duration handling: If the audio exceeds the `duration` value (for example, 5 seconds), only the first 5 seconds are used. If the audio is shorter than the video, the remaining video is silent. For example, 3-second audio with a 5-second video produces 3 seconds of audio followed by 2 seconds of silence. |
| **parameters** `*object*` (Optional) Video generation parameters: resolution, prompt rewriting, and watermark. **Properties** **resolution** `*string*` (Optional) **Important** Resolution affects cost. Check [Model pricing](/help/en/model-studio/models#577af209dc0rc) before calling. Resolution tier of the generated video. Controls the output clarity (total pixel count). - wan2.7-t2v, wan2.7-t2v-2026-06-12: Valid values: 720P, 1080P. Default: `1080P`. **ratio** `*string*` (Optional) Aspect ratio of the output video. - `16:9` (default) - `9:16` - `1:1` - `4:3` - `3:4` Output resolutions (width\\*height) by aspect ratio: \\| Resolution tier \\| Aspect ratio \\| Output video resolution (width\\\\*height) \\| \\| --- \\| --- \\| --- \\| \\| 720P \\| 16:9 \\| 1280\\\\*720 \\| \\| 9:16 \\| 720\\\\*1280 \\| \\| 1:1 \\| 960\\\\*960 \\| \\| 4:3 \\| 1104\\\\*832 \\| \\| 3:4 \\| 832\\\\*1104 \\| \\| 1080P \\| 16:9 \\| 1920\\\\*1080 \\| \\| 9:16 \\| 1080\\\\*1920 \\| \\| 1:1 \\| 1440\\\\*1440 \\| \\| 4:3 \\| 1648\\\\*1248 \\| \\| 3:4 \\| 1248\\\\*1648 \\| **duration** `*integer*` (Optional) **Important** Duration affects cost. Billing is per second. Check [Model pricing](/help/en/model-studio/model-pricing#8e284e51d1nil) before calling. Duration of the output video, in seconds. - wan2.7-t2v, wan2.7-t2v-2026-06-12: An integer from 2 to 15. Default: 5. **prompt\\_extend** `*boolean*` (Optional) Enables prompt rewriting. When enabled, an LLM rewrites the input prompt to improve generation quality. Best for short prompts but adds latency. - `true` (default) - `false` **watermark** `*boolean*` (Optional) Adds a watermark in the lower-right corner with the text "AI Generated". - `false` (default) - `true` **seed** `*integer*` (Optional) The random number seed must be an integer in the range `[0, 2147483647]`. If not specified, a random seed is generated. A fixed seed improves reproducibility. Because model generation is probabilistic, the same seed does not guarantee identical results. |

| #### Response parameters | ### Successful response Save the `task_id` to query the task status and result. ``` { "output": { "task_status": "PENDING", "task_id": "0385dc79-5ff8-4d82-bcb6-xxxxxx" }, "request_id": "4909100c-7b5a-9f92-bfe5-xxxxxx" } ``` ### Error response Task creation failed. See [Error codes](/help/en/model-studio/error-code). ``` { "code": "InvalidApiKey", "message": "No API-key provided.", "request_id": "7438d53d-6eb8-4596-8835-xxxxxx" } ``` |
| --- | --- |
| **output** `*object*` Task output. **Properties** **task\\_id** `*string*` The task ID. Valid for queries for 24 hours. **task\\_status** `*string*` The status of the task. **Enumeration values** - PENDING - RUNNING - SUCCEEDED - FAILED - CANCELED - UNKNOWN: The task does not exist or its status is unknown. |
| **request\\_id** `*string*` Unique request identifier for tracing and troubleshooting. |
| **code** `*string*` Error code. Returned only for failed requests. See [Error codes](/help/en/model-studio/error-code). |
| **message** `*string*` Detailed error message. Returned only for failed requests. See [Error codes](/help/en/model-studio/error-code). |

#### **Step 2: Query the result**

## **Beijing**

`GET https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api/v1/tasks/{task_id}`

## **Singapore**

`GET https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/tasks/{task_id}`

## **Singapore**

`GET https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/tasks/{task_id}`

## **Beijing**

`GET https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api/v1/tasks/{task_id}`

Replace `{WorkspaceId}` with your actual [workspace ID](/help/en/model-studio/obtain-the-app-id-and-workspace-id#d3eb3cd37b7fu).

**Note**

-   **Polling recommendation**: Video generation takes several minutes. Use a polling mechanism with a reasonable interval, such as 15 seconds.
    
-   **Task state transition**: PENDING → RUNNING → SUCCEEDED or FAILED.
    
-   **Result link**: After a task succeeds, a video URL valid for **24 hours** is returned. Download and save the video to permanent storage, such as [OSS](/help/en/oss/user-guide/what-is-oss).
    
-   `**task_id**` **validity**: **24 hours**. After this period, queries return the task status as `UNKNOWN`.
    

| #### Request parameters | ## Query task result Replace `{task_id}` with the `task_id` value returned by the previous API call. The `task_id` is valid for queries for 24 hours, Replace `{WorkspaceId}` with your actual [workspace ID](/help/en/model-studio/obtain-the-app-id-and-workspace-id#d3eb3cd37b7fu). ``` curl -X GET https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/tasks/{task_id} \\ --header "Authorization: Bearer $DASHSCOPE_API_KEY" ``` |
| --- | --- |
| ##### **Headers** |
| **Authorization** `*string*` **(Required)** Authenticates the request with a Model Studio API key. Example: Bearer sk-xxxx. |
| ##### **Path parameters** |
| **task\\_id** `*string*` **(Required)** The ID of the task. |

| #### **Response parameters** | #### **Task executed successfully** Video URLs are valid for only 24 hours and then automatically purged. Save generated videos promptly. ``` { "request_id": "caa62a12-8841-41a6-8af2-xxxxxx", "output": { "task_id": "eff1443c-ccab-4676-aad3-xxxxxx", "task_status": "SUCCEEDED", "submit_time": "2025-09-29 14:18:52.331", "scheduled_time": "2025-09-29 14:18:59.290", "end_time": "2025-09-29 14:23:39.407", "orig_prompt": "An epic and cute scene. A small, adorable cartoon kitten general, wearing exquisitely detailed golden armor and a slightly oversized helmet, stands bravely on a cliff. He rides a small but heroic warhorse and says: 'The long clouds of Qinghai darken the snowy mountains, a lone city gazes at Yumen Pass from afar. Through a hundred battles in the yellow sand, the golden armor is worn, but we will not return until we have broken Loulan'. Below the cliff, a vast and endless army of mice with makeshift weapons is charging forward. This is a dramatic, large-scale battle scene inspired by ancient Chinese war epics. In the distance, dark clouds gather in the sky over the snowy mountains. The overall atmosphere is a comical and epic fusion of 'cute' and 'domineering'.", "video_url": "https://dashscope-result-sh.oss-accelerate.aliyuncs.com/xxx.mp4?Expires=xxx" }, "usage": { "duration": 10, "input_video_duration": 0, "output_video_duration": 10, "video_count": 1, "ratio": "16:9", "SR": 720 } } ``` ## Task execution failed When a task fails, `task_status` is FAILED with an error code and message. See [Error codes](/help/en/model-studio/error-code). ``` { "request_id": "e5d70b02-ebd3-98ce-9fe8-759d7d7b107d", "output": { "task_id": "86ecf553-d340-4e21-af6e-a0c6a421c010", "task_status": "FAILED", "code": "InvalidParameter", "message": "The size does not match xxxxxx" } } ``` ## Task query expired The `task_id` is valid for 24 hours. After this period, queries return the following error. ``` { "request_id": "a4de7c32-7057-9f82-8581-xxxxxx", "output": { "task_id": "502a00b1-19d9-4839-a82f-xxxxxx", "task_status": "UNKNOWN" } } ``` |
| --- | --- |
| **output** `*object*` Task output. **Properties** **task\\_id** `*string*` The task ID. Valid for queries for 24 hours. **task\\_status** `*string*` The status of the task. **Enumeration values** - PENDING - RUNNING - SUCCEEDED - FAILED - CANCELED - UNKNOWN: The task does not exist or its status is unknown. **State transitions during polling:** - PENDING → RUNNING → SUCCEEDED or FAILED. - The initial query status is usually PENDING or RUNNING. - When the status changes to SUCCEEDED, the response contains the generated video URL. - If the status is FAILED, check the error message and retry the task. **submit\\_time** `*string*` The time when the task was submitted. The time is in UTC+8 and the format is YYYY-MM-DD HH:mm:ss.SSS. **scheduled\\_time** `*string*` The time when the task was executed. The time is in UTC+8 and the format is YYYY-MM-DD HH:mm:ss.SSS. **end\\_time** `*string*` The time when the task was completed. The time is in UTC+8 and the format is YYYY-MM-DD HH:mm:ss.SSS. **video\\_url** `*string*` URL of the generated video. Returned only when `task_status` is SUCCEEDED. Valid for 24 hours. The video is in MP4 format with H.264 encoding. **orig\\_prompt** `*string*` The original input prompt, corresponding to the request parameter `prompt`. **code** `*string*` Error code. Returned only for failed requests. See [Error codes](/help/en/model-studio/error-code). **message** `*string*` Detailed error message. Returned only for failed requests. See [Error codes](/help/en/model-studio/error-code). |
| **usage** `*object*` Output statistics. Returned only for successful tasks. **Properties** **duration** `*float*` Total video duration, used for billing. Equal to `output_video_duration`. **input\\_video\\_duration** `*integer*` Fixed value: 0. **output\\_video\\_duration** `*integer*` Output video duration in seconds. Matches the `input.duration` value. **SR** `*integer*` Resolution tier of the output video. Example: 720. **ratio** `*string*` Aspect ratio of the output video. Example: 16:9. **video\\_count** `*integer*` Number of videos generated. Always 1. |
| **request\\_id** `*string*` Unique request identifier for tracing and troubleshooting. |

## HTTP (wan2.6 and earlier)

**Important**

This interface uses the **legacy protocol** and supports **wan2.6 and earlier (wan2.5/wan2.2/****wan2.1****)**.

Text-to-video tasks take 1–5 minutes, so the API uses asynchronous invocation: **Create a task → Poll for the result**.

#### **Step 1: Create a task**

## **Singapore**

`POST https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis`

## **Virginia**

`POST https://dashscope-us.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis`

## **Beijing**

`POST https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis`

## **Frankfurt**

POST `https://{WorkspaceId}.eu-central-1.maas.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis`

Replace `{WorkspaceId}` with your actual [workspace ID](/help/en/model-studio/obtain-the-app-id-and-workspace-id#d3eb3cd37b7fu).

**Note**

-   After the task is created, use the returned `task_id` to query the result. The `task_id` is valid for 24 hours. **Do not create duplicate tasks**. Instead, use polling to retrieve the result.
    
-   For guidance for beginners, see [Call APIs with Postman or cURL](/help/en/model-studio/first-call-to-image-and-video-api).
    

| #### Request parameters | ## Multi-shot narrative - To create a multi-shot narrative, set `shot_type` to `"multi"`. - Set `prompt_extend` to `true` to enable prompt rewriting for storyboard optimization. ``` curl --location 'https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis' \\ -H 'X-DashScope-Async: enable' \\ -H "Authorization: Bearer $DASHSCOPE_API_KEY" \\ -H 'Content-Type: application/json' \\ -d '{ "model": "wan2.6-t2v", "input": { "prompt": "Shot from a low angle, in a medium close-up, with warm tones, mixed lighting (the practical light from the desk lamp blends with the overcast light from the window), side lighting, and a central composition. In a classic detective office, wooden bookshelves are filled with old case files and ashtrays. A green desk lamp illuminates a case file spread out in the center of the desk. A fox, wearing a dark brown trench coat and a light gray fedora, sits in a leather chair, its fur crimson, its tail resting lightly on the edge, its fingers slowly turning yellowed pages. Outside, a steady drizzle falls beneath a blue sky, streaking the glass with meandering streaks. It slowly raises its head, its ears twitching slightly, its amber eyes gazing directly at the camera, its mouth clearly moving as it speaks in a smooth, cynical voice: \\"The case was cold, colder than a fish in winter. But every chicken has its secrets, and I, for one, intended to find them \\".", "audio_url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20250929/stjqnq/%E7%8B%90%E7%8B%B8.mp3" }, "parameters": { "size": "1280*720", "prompt_extend": true, "duration": 10, "shot_type":"multi" } }' ``` ## Pass an audio file Supported models: wan2.6 and wan2.5 series. Set the `input.audio_url` parameter to a custom audio file URL. ``` curl --location 'https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis' \\ -H 'X-DashScope-Async: enable' \\ -H "Authorization: Bearer $DASHSCOPE_API_KEY" \\ -H 'Content-Type: application/json' \\ -d '{ "model": "wan2.5-t2v-preview", "input": { "prompt": "Shot from a low angle, in a medium close-up, with warm tones, mixed lighting (the practical light from the desk lamp blends with the overcast light from the window), side lighting, and a central composition. In a classic detective office, wooden bookshelves are filled with old case files and ashtrays. A green desk lamp illuminates a case file spread out in the center of the desk. A fox, wearing a dark brown trench coat and a light gray fedora, sits in a leather chair, its fur crimson, its tail resting lightly on the edge, its fingers slowly turning yellowed pages. Outside, a steady drizzle falls beneath a blue sky, streaking the glass with meandering streaks. It slowly raises its head, its ears twitching slightly, its amber eyes gazing directly at the camera, its mouth clearly moving as it speaks in a smooth, cynical voice: \\"The case was cold, colder than a fish in winter. But every chicken has its secrets, and I, for one, intended to find them \\".", "audio_url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20250929/stjqnq/%E7%8B%90%E7%8B%B8.mp3" }, "parameters": { "size": "832*480", "prompt_extend": true, "duration": 10 } }' ``` ## Automatic dubbing Supported models: wan2.6 and wan2.5 series. Without the `input.audio_url` parameter, the model generates background music or sound effects that match the video content. ``` curl --location 'https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis' \\ -H 'X-DashScope-Async: enable' \\ -H "Authorization: Bearer $DASHSCOPE_API_KEY" \\ -H 'Content-Type: application/json' \\ -d '{ "model": "wan2.5-t2v-preview", "input": { "prompt": "Shot from a low angle, in a medium close-up, with warm tones, mixed lighting (the practical light from the desk lamp blends with the overcast light from the window), side lighting, and a central composition. In a classic detective office, wooden bookshelves are filled with old case files and ashtrays. A green desk lamp illuminates a case file spread out in the center of the desk. A fox, wearing a dark brown trench coat and a light gray fedora, sits in a leather chair, its fur crimson, its tail resting lightly on the edge, its fingers slowly turning yellowed pages. Outside, a steady drizzle falls beneath a blue sky, streaking the glass with meandering streaks. It slowly raises its head, its ears twitching slightly, its amber eyes gazing directly at the camera, its mouth clearly moving as it speaks in a smooth, cynical voice: \\"The case was cold, colder than a fish in winter. But every chicken has its secrets, and I, for one, intended to find them \\"" }, "parameters": { "size": "832*480", "prompt_extend": true, "duration": 10 } }' ``` ## Generate a silent video Only wan2.2 and wan2.1 series models support silent video generation. These models produce silent videos by default without additional configuration. > The wan2.6 and wan2.5 series models generate videos with audio by default. ``` curl --location 'https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis' \\ -H 'X-DashScope-Async: enable' \\ -H "Authorization: Bearer $DASHSCOPE_API_KEY" \\ -H 'Content-Type: application/json' \\ -d '{ "model": "wan2.2-t2v-plus", "input": { "prompt": "Low contrast. In a retro 1970s-style subway station, a street musician plays amidst dim colors and rough textures. He wears an old-fashioned jacket and holds a guitar, playing with concentration. Commuters hurry past, and a small crowd gradually gathers to listen. The camera slowly pans to the right, capturing a scene where the sound of the instrument mixes with the city's noise, with old-fashioned subway signs and mottled walls in the background." }, "parameters": { "size": "832*480", "prompt_extend": true } }' ``` ## Use a negative prompt Supported models: All models. Use negative\\_prompt to exclude specific elements (such as "flowers") from the generated video. ``` curl --location 'https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis' \\ -H 'X-DashScope-Async: enable' \\ -H "Authorization: Bearer $DASHSCOPE_API_KEY" \\ -H 'Content-Type: application/json' \\ -d '{ "model": "wan2.2-t2v-plus", "input": { "prompt": "A kitten running in the moonlight", "negative_prompt": "flowers" }, "parameters": { "size": "832*480" } }' ``` |
| --- | --- |
| ##### Request headers |
| **Content-Type** `*string*` **(Required)** The content type of the request. Must be `application/json`. |
| **Authorization** `*string*` **(Required)** Authenticates the request with a Model Studio API key. Example: Bearer sk-xxxx. |
| **X-DashScope-Async** `*string*` **(Required)** Enables asynchronous processing. HTTP requests support only asynchronous calls. Must be `enable`. **Important** If this request header is missing, the error "current user api does not support synchronous calls" is returned. |
| ##### Request body |
| **model** `*string*` **(Required)** Model name. For models and pricing, see [Model pricing](/help/en/model-studio/models#577af209dc0rc). Example: wan2.6-t2v. |
| **input** `*object*` **(Required)** Input data, including the prompt. **Properties** **prompt** `*string*` **(Required)** Text prompt describing the video content and visual style. Supports Chinese and English. Each character or letter counts as one. Text beyond the limit is auto-truncated. Maximum length by model: - wan2.6 and wan2.5 series models: Up to 1,500 characters. - wan2.2 and wan2.1 series models: Up to 800 characters. Example: A kitten running in the moonlight. For tips, see [Text-to-Video/Image-to-Video Prompt Guide](/help/en/model-studio/text-to-video-prompt). **negative\\_prompt** `*string*` (Optional) Elements to exclude from the generated video. Supports Chinese and English. Maximum 500 characters; longer text is auto-truncated. Example: low resolution, error, worst quality, low quality, disfigured, extra fingers, bad proportions. **audio\\_url** `*string*` (Optional) **Supported models: wan2.6 and wan2.5 series.** URL of the audio file for video generation. Supported formats: 1. Public URL: - HTTP and HTTPS protocols. - Example: https://help-static-aliyun-doc.aliyuncs.com/xxx.mp3. Audio limits: - Format: WAV, MP3. - Duration: 3 s to 30 s. - File size: Up to 15 MB. - Duration handling: If the audio exceeds the `duration` value (for example, 5 s), only the first 5 s are used. If the audio is shorter than the video, the remaining video is silent. For example, 3 s audio with a 5 s video produces 3 s of audio followed by 2 s of silence. |
| **parameters** `*object*` (Optional) Video generation parameters: resolution, prompt rewriting, and watermark. **Properties** **size** `*string*` (Optional) **Important** - The `size` parameter affects cost: Cost = Unit price (resolution-based) x Duration (seconds). For the same model: 1080p > 720p > 480p. Check [model pricing](/help/en/model-studio/models#577af209dc0rc). - Set `size` to a specific resolution (such as `1280*720`), not an aspect ratio (1:1) or tier label (480p). Output video resolution in `**width*height**` format. Defaults and valid values depend on the model: - **wan2.6-t2v**: The default value is `1920*1080` (1080p). Valid resolutions: all in the 720p and 1080p tiers. - **wan2.6-t2v-us**: The default value is `1920*1080` (1080p). Valid resolutions: all in the 720p and 1080p tiers. - **wan2.5-t2v-preview**: The default value is `1920*1080` (1080p). Valid resolutions: all in the 480p, 720p, and 1080p tiers. - **wan2.2-t2v-plus**: The default value is `1920*1080` (1080p). Valid resolutions: all in the 480p and 1080p tiers. - **wan2.1-t2v-turbo**: The default value is `1280*720` (720p). Valid resolutions: all in the 480p and 720p tiers. - **wan2.1-t2v-plus**: The default value is `1280*720` (720p). Valid resolutions: all those in the 720p tier. 480p tier resolutions and aspect ratios: - `832*480`: 16:9. - `480*832`: 9:16. - `624*624`: 1:1. 720p tier resolutions and aspect ratios: - `1280*720`: 16:9. - `720*1280`: 9:16. - `960*960`: 1:1. - `1088*832`: 4:3. - `832*1088`: 3:4. 1080p tier resolutions and aspect ratios: - `1920*1080`: 16:9. - `1080*1920`: 9:16. - `1440*1440`: 1:1. - `1632*1248`: 4:3. - `1248*1632`: 3:4. **duration** `*integer*` (Optional) **Important** Duration affects cost: Cost = Unit price (resolution-based) x Duration (seconds). Check [model pricing](/help/en/model-studio/model-pricing#8e284e51d1nil). Output video duration in seconds. Valid values depend on the model: - wan2.6-t2v: An integer from 2 to 15. The default value is 5. - wan2.6-t2v-us: Valid values are 5 and 10. The default value is 5. - wan2.5-t2v-preview: Valid values are 5 and 10. The default value is 5. - wan2.2-t2v-plus: Fixed at 5 seconds and cannot be changed. - wan2.1-t2v-plus: Fixed at 5 seconds and cannot be changed. - wan2.1-t2v-turbo: Fixed at 5 seconds and cannot be changed. **prompt\\_extend** `*boolean*` (Optional) Enables prompt rewriting. When enabled, an LLM rewrites the input prompt to improve quality. Best for short prompts but adds latency. - `true` (default) - `false` **shot\\_type** `*string*` (Optional) **Supported models: wan2.6 models.** Shot structure for the output video: one continuous shot or multiple shots with transitions. Valid values: - `single` (default) - `multi` This parameter takes effect only when `"prompt_extend": true` is set. Priority: `shot_type` overrides the prompt. Setting `shot_type` to `single` produces a single-shot video even if the prompt requests multi-shot. **watermark** `*boolean*` (Optional) Adds a watermark in the lower-right corner with the text "AI Generated". - `false` (default) - `true` **seed** `*integer*` (Optional) The random number seed must be an integer in the range `[0, 2147483647]`. If not specified, a random seed is generated. A fixed seed improves reproducibility. Because model generation is probabilistic, the same seed does not guarantee identical results. |

| #### Response parameters | ### Successful response Save the `task_id` to query the task status and result. ``` { "output": { "task_status": "PENDING", "task_id": "0385dc79-5ff8-4d82-bcb6-xxxxxx" }, "request_id": "4909100c-7b5a-9f92-bfe5-xxxxxx" } ``` ### Error response Task creation failed. See [Error codes](/help/en/model-studio/error-code). ``` { "code": "InvalidApiKey", "message": "No API-key provided.", "request_id": "7438d53d-6eb8-4596-8835-xxxxxx" } ``` |
| --- | --- |
| **output** `*object*` Task output. **Properties** **task\\_id** `*string*` The task ID. Valid for queries for 24 hours. **task\\_status** `*string*` The status of the task. **Enumeration values** - PENDING - RUNNING - SUCCEEDED - FAILED - CANCELED - UNKNOWN: The task does not exist or its status is unknown. |
| **request\\_id** `*string*` Unique request identifier for tracing and troubleshooting. |
| **code** `*string*` Error code. Returned only for failed requests. See [Error codes](/help/en/model-studio/error-code). |
| **message** `*string*` Detailed error message. Returned only for failed requests. See [Error codes](/help/en/model-studio/error-code). |

#### **Step 2: Query the result**

## **Singapore**

`GET https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/tasks/{task_id}`

## **Virginia**

`GET https://dashscope-us.aliyuncs.com/api/v1/tasks/{task_id}`

## **Beijing**

`GET https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api/v1/tasks/{task_id}`

## **Frankfurt**

GET `https://{WorkspaceId}.eu-central-1.maas.aliyuncs.com/api/v1/tasks/{task_id}`

Replace `{WorkspaceId}` with your actual [workspace ID](/help/en/model-studio/obtain-the-app-id-and-workspace-id#d3eb3cd37b7fu).

**Note**

-   **Polling recommendation**: Video generation takes several minutes. Use a polling mechanism with a reasonable interval, such as 15 seconds.
    
-   **Task state transition**: PENDING → RUNNING → SUCCEEDED or FAILED.
    
-   **Result link**: After a task succeeds, a video URL valid for **24 hours** is returned. Download and save the video to permanent storage, such as [OSS](/help/en/oss/user-guide/what-is-oss).
    
-   `**task_id**` **validity**: **24 hours**. After this period, queries return the task status as `UNKNOWN`.
    

| #### Request parameters | ## Query task result Replace `{task_id}` with the `task_id` value returned by the previous API call. The `task_id` is valid for queries for 24 hours, Replace `{WorkspaceId}` with your actual [workspace ID](/help/en/model-studio/obtain-the-app-id-and-workspace-id#d3eb3cd37b7fu). ``` curl -X GET https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/tasks/{task_id} \\ --header "Authorization: Bearer $DASHSCOPE_API_KEY" ``` |
| --- | --- |
| ##### **Headers** |
| **Authorization** `*string*` **(Required)** Authenticates the request with a Model Studio API key. Example: Bearer sk-xxxx. |
| ##### **Path parameters** |
| **task\\_id** `*string*` **(Required)** The ID of the task. |

| #### **Response parameters** | #### **Task executed successfully** Video URLs are valid for only 24 hours and then automatically purged. Save generated videos promptly. ``` { "request_id": "abbf7aa3-9652-4785-a622-xxxxxx", "output": { "task_id": "38513c71-5190-48e1-9f3b-xxxxxx", "task_status": "SUCCEEDED", "submit_time": "2025-09-29 14:05:22.119", "scheduled_time": "2025-09-29 14:05:28.278", "end_time": "2025-09-29 14:10:00.437", "orig_prompt": "Shot from a low angle, in a medium close-up, with warm tones, mixed lighting (the practical light from the desk lamp blends with the overcast light from the window), side lighting, and a central composition. In a classic detective's office, wooden bookshelves are filled with old case files and ashtrays. A green desk lamp illuminates a case file spread out in the center of the desk. A fox, wearing a dark brown trench coat and a light gray fedora, sits in a leather chair, its fur crimson, its tail resting lightly on the edge, its fingers slowly turning yellowed pages. Outside, a steady drizzle falls beneath a blue sky, streaking the glass with meandering streaks. It slowly raises its head, its ears twitching slightly, its amber eyes gazing directly at the camera, its mouth clearly moving as it speaks in a smooth, cynical voice: 'The case was cold, colder than a fish in winter. But every chicken has its secrets, and I, for one, intended to find them'.", "video_url": "https://dashscope-result-sh.oss-accelerate.aliyuncs.com/xxx.mp4?Expires=xxx" }, "usage": { "duration": 10, "size": "1280*720", "input_video_duration": 0, "output_video_duration": 10, "video_count": 1, "SR": 720 } } ``` ## Task execution failed When a task fails, `task_status` is FAILED with an error code and message. See [Error codes](/help/en/model-studio/error-code). ``` { "request_id": "e5d70b02-ebd3-98ce-9fe8-759d7d7b107d", "output": { "task_id": "86ecf553-d340-4e21-af6e-a0c6a421c010", "task_status": "FAILED", "code": "InvalidParameter", "message": "The size is not match xxxxxx" } } ``` ## Task query expired The `task_id` is valid for 24 hours. After this period, queries return the following error. ``` { "request_id": "a4de7c32-7057-9f82-8581-xxxxxx", "output": { "task_id": "502a00b1-19d9-4839-a82f-xxxxxx", "task_status": "UNKNOWN" } } ``` |
| --- | --- |
| **output** `*object*` Task output. **Properties** **task\\_id** `*string*` The task ID. Valid for queries for 24 hours. **task\\_status** `*string*` The status of the task. **Enumeration values** - PENDING - RUNNING - SUCCEEDED - FAILED - CANCELED - UNKNOWN: The task does not exist or its status is unknown. **State transitions during polling:** - PENDING → RUNNING → SUCCEEDED or FAILED. - The initial query status is usually PENDING or RUNNING. - When the status changes to SUCCEEDED, the response contains the generated video URL. - If the status is FAILED, check the error message and retry the task. **submit\\_time** `*string*` The time when the task was submitted. The time is in UTC+8 and the format is YYYY-MM-DD HH:mm:ss.SSS. **scheduled\\_time** `*string*` The time when the task was executed. The time is in UTC+8 and the format is YYYY-MM-DD HH:mm:ss.SSS. **end\\_time** `*string*` The time when the task was completed. The time is in UTC+8 and the format is YYYY-MM-DD HH:mm:ss.SSS. **video\\_url** `*string*` URL of the generated video. Returned only when `task_status` is SUCCEEDED. Valid for 24 hours. The video is in MP4 format with H.264 encoding. **orig\\_prompt** `*string*` The original input prompt, corresponding to the request parameter `prompt`. **actual\\_prompt** `*string*` When `prompt_extend=true`, the system rewrites the input prompt. This field contains the rewritten prompt used for generation. - Not returned when `prompt_extend=false`. - The wan2.6 model does not return this field, regardless of the `prompt_extend` value. **code** `*string*` Error code. Returned only for failed requests. See [Error codes](/help/en/model-studio/error-code). **message** `*string*` Detailed error message. Returned only for failed requests. See [Error codes](/help/en/model-studio/error-code). |
| **usage** `*object*` Output statistics. Returned only for successful tasks. **Properties** **video\\_duration** `*integer*` Returned only for wan2.5 and earlier (used for billing). Duration of the output video in seconds. Valid values: 5, 10. **duration** `*float*` Returned only for wan2.6 (used for billing). Total video duration. Formula: `duration=input_video_duration+output_video_duration`. **input\\_video\\_duration** `*integer*` Returned only for wan2.6. Fixed value: 0. **output\\_video\\_duration** `*integer*` Returned only for wan2.6. Output video duration in seconds. Matches the `input.duration` value. **SR** `*integer*` Returned only for wan2.6. Resolution tier of the output video. Example: 720. **size** `*string*` Returned only for wan2.6. Output resolution in "width×height" format. Example: 1920×1080. **video\\_ratio** `*string*` Returned only for wan2.5 and earlier. Output resolution in "width×height" format. Example: 832×480. **video\\_count** `*integer*` Number of videos generated. Always 1. |
| **request\\_id** `*string*` Unique request identifier for tracing and troubleshooting. |

## DashScope SDK

SDK parameter names mostly match the [HTTP API](#42703589880ts), with structures following language-specific conventions.

Text-to-video tasks take 1–5 minutes. The SDK wraps the asynchronous HTTP call flow and supports both synchronous and asynchronous invocation.

> Actual processing time depends on queue depth and service load.

### Python SDK

**Important**

-   The SDK supports wan2.6 and earlier. **wan2.7 is not supported.**
    
-   DashScope Python SDK version **1.25.8** or later is required.
    
    Older versions may return "url error, please check url!". To update, see [Install the SDK](/help/en/model-studio/install-sdk).
    

Set **dashscope.base\_http\_api\_url** to the region endpoint:

## **Beijing**

`dashscope.base_http_api_url = 'https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api/v1'`

## **Singapore**

`dashscope.base_http_api_url = 'https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1'`

## **Virginia**

`dashscope.base_http_api_url = 'https://dashscope-us.aliyuncs.com/api/v1'`

Replace `{WorkspaceId}` with your actual [workspace ID](/help/en/model-studio/obtain-the-app-id-and-workspace-id#d3eb3cd37b7fu).

## **Synchronous invocation**

##### Request example

```
from http import HTTPStatus
from dashscope import VideoSynthesis
import dashscope
import os

# URL for the Singapore region. URLs vary by region. For more information, see https://www.alibabacloud.com/help/en/model-studio/text-to-video-api-reference.
dashscope.base_http_api_url = 'https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1'

# If no environment variable is configured, replace with your Model Studio API key: api_key="sk-xxx".
# API keys vary by region. For more information, see https://www.alibabacloud.com/help/en/model-studio/get-api-key.
api_key = os.getenv("DASHSCOPE_API_KEY")

def sample_sync_call_t2v():
    # Call the sync API and return the result.
    print('Please wait...')
    rsp = VideoSynthesis.call(api_key=api_key,
                              model='wan2.6-t2v',
                              prompt="Shot from a low angle, in a medium close-up, with warm tones, mixed lighting (the practical light from the desk lamp blends with the overcast light from the window), side lighting, and a central composition. In a classic detective office, wooden bookshelves are filled with old case files and ashtrays. A green desk lamp illuminates a case file spread out in the center of the desk. A fox, wearing a dark brown trench coat and a light gray fedora, sits in a leather chair, its fur crimson, its tail resting lightly on the edge, its fingers slowly turning yellowed pages. Outside, a steady drizzle falls beneath a blue sky, streaking the glass with meandering streaks. It slowly raises its head, its ears twitching slightly, its amber eyes gazing directly at the camera, its mouth clearly moving as it speaks in a smooth, cynical voice: 'The case was cold, colder than a fish in winter. But every chicken has its secrets, and I, for one, intended to find them.'",
                              audio_url='https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20250929/stjqnq/%E7%8B%90%E7%8B%B8.mp3',
                              size='1280*720',
                              duration=10,
                              negative_prompt="",
                              prompt_extend=True,
                              watermark=False,
                              seed=12345)
    print(rsp)
    if rsp.status_code == HTTPStatus.OK:
        print(rsp.output.video_url)
    else:
        print('Failed. Status code: %s, code: %s, message: %s' %
              (rsp.status_code, rsp.code, rsp.message))

if __name__ == '__main__':
    sample_sync_call_t2v()
```

##### Response example

> The video\_url expires after 24 hours. Download promptly.

```
{
    "status_code": 200,
    "request_id": "167f3beb-3dd0-47fe-a83c-xxxxxx",
    "code": null,
    "message": "",
    "output": {
        "task_id": "5b65411f-d946-4e29-859e-xxxxxx",
        "task_status": "SUCCEEDED",
        "video_url": "https://dashscope-result-bj.oss-accelerate.aliyuncs.com/xxx.mp4?Expires=xxx",
        "submit_time": "2025-10-23 11:47:23.879",
        "scheduled_time": "2025-10-23 11:47:34.351",
        "end_time": "2025-10-23 11:52:35.323",
        "orig_prompt": "Shot from a low angle, in a medium close-up, with warm tones, mixed lighting (the practical light from the desk lamp blends with the overcast light from the window), side lighting, and a central composition. In a classic detective's office, wooden bookshelves are filled with old case files and ashtrays. A green desk lamp illuminates a case file spread out in the center of the desk. A fox, wearing a dark brown trench coat and a light gray fedora, sits in a leather chair, its fur crimson, its tail resting lightly on the edge, its fingers slowly turning yellowed pages. Outside, a steady drizzle falls beneath a blue sky, streaking the glass with meandering streaks. It slowly raises its head, its ears twitching slightly, its amber eyes gazing directly at the camera, its mouth clearly moving as it speaks in a smooth, cynical voice: 'The case was cold, colder than a fish in winter. But every chicken has its secrets, and I, for one, intended to find them '."
    },
    "usage": {
        "video_count": 1,
        "video_duration": 0,
        "video_ratio": "",
        "duration": 10,
        "size": "1280*720",
        "input_video_duration": 0,
        "output_video_duration": 10,
        "SR": 720
    }
}
```

## **Asynchronous invocation**

##### Request example

```
from http import HTTPStatus
from dashscope import VideoSynthesis
import dashscope
import os

# This is the Singapore region URL. URLs vary by region. For more information, see: https://www.alibabacloud.com/help/en/model-studio/text-to-video-api-reference
dashscope.base_http_api_url = 'https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1'

# If an environment variable is not configured, replace this with your Model Studio API key: api_key="sk-xxx"
# API keys vary by region. For more information, see: https://www.alibabacloud.com/help/en/model-studio/get-api-key
api_key = os.getenv("DASHSCOPE_API_KEY")

def sample_async_call_t2v():
    # Call the asynchronous API and return the task information.
    # Use the task ID to check the status.
    rsp = VideoSynthesis.async_call(api_key=api_key,
                                    model='wan2.6-t2v',
                                    prompt="Shot from a low angle, in a medium close-up, with warm tones, mixed lighting (the practical light from the desk lamp blends with the overcast light from the window), side lighting, and a central composition. In a classic detective office, wooden bookshelves are filled with old case files and ashtrays. A green desk lamp illuminates a case file spread out in the center of the desk. A fox, wearing a dark brown trench coat and a light gray fedora, sits in a leather chair, its fur crimson, its tail resting lightly on the edge, its fingers slowly turning yellowed pages. Outside, a steady drizzle falls beneath a blue sky, streaking the glass with meandering streaks. It slowly raises its head, its ears twitching slightly, its amber eyes gazing directly at the camera, its mouth clearly moving as it speaks in a smooth, cynical voice: 'The case was cold, colder than a fish in winter. But every chicken has its secrets, and I, for one, intended to find them '.",
                                    audio_url='https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20250929/stjqnq/%E7%8B%90%E7%8B%B8.mp3',
                                    size='1280*720',
                                    duration=10,
                                    negative_prompt="",
                                    prompt_extend=True,
                                    watermark=False,
                                    seed=12345)
    print(rsp)
    if rsp.status_code == HTTPStatus.OK:
        print("task_id: %s" % rsp.output.task_id)
    else:
        print('Failed. Status code: %s, code: %s, message: %s' %
              (rsp.status_code, rsp.code, rsp.message))
                           
    # Retrieve the task information, including the task status.
    status = VideoSynthesis.fetch(task=rsp, api_key=api_key)
    if status.status_code == HTTPStatus.OK:
        print(status.output.task_status)  # Check the task status.
    else:
        print('Failed. Status code: %s, code: %s, message: %s' %
              (status.status_code, status.code, status.message))

    # Wait for the task to complete. This method calls fetch at intervals and checks if the task is in a finished state.
    rsp = VideoSynthesis.wait(task=rsp, api_key=api_key)
    print(rsp)
    if rsp.status_code == HTTPStatus.OK:
        print(rsp.output.video_url)
    else:
        print('Failed. Status code: %s, code: %s, message: %s' %
              (rsp.status_code, rsp.code, rsp.message))

if __name__ == '__main__':
    sample_async_call_t2v()
```

##### Response example

1.  Task creation response example
    
    ```
    {
    	"status_code": 200,
    	"request_id": "c86ff7ba-8377-917a-90ed-xxxxxx",
    	"code": "",
    	"message": "",
    	"output": {
    		"task_id": "721164c6-8619-4a35-a6d9-xxxxxx",
    		"task_status": "PENDING",
    		"video_url": ""
    	},
    	"usage": null
    }
    ```
    
2.  Task query response example
    
    > The video\_url expires after 24 hours. Download promptly.
    
    ```
    {
        "status_code": 200,
        "request_id": "167f3beb-3dd0-47fe-a83c-xxxxxx",
        "code": null,
        "message": "",
        "output": {
            "task_id": "5b65411f-d946-4e29-859e-xxxxxx",
            "task_status": "SUCCEEDED",
            "video_url": "https://dashscope-result-bj.oss-accelerate.aliyuncs.com/xxx.mp4?Expires=xxx",
            "submit_time": "2025-10-23 11:47:23.879",
            "scheduled_time": "2025-10-23 11:47:34.351",
            "end_time": "2025-10-23 11:52:35.323",
            "orig_prompt": "Shot from a low angle, in a medium close-up, with warm tones, mixed lighting (the practical light from the desk lamp blends with the overcast light from the window), side lighting, and a central composition. In a classic detective's office, wooden bookshelves are filled with old case files and ashtrays. A green desk lamp illuminates a case file spread out in the center of the desk. A fox, wearing a dark brown trench coat and a light gray fedora, sits in a leather chair, its fur crimson, its tail resting lightly on the edge, its fingers slowly turning yellowed pages. Outside, a steady drizzle falls beneath a blue sky, streaking the glass with meandering streaks. It slowly raises its head, its ears twitching slightly, its amber eyes gazing directly at the camera, its mouth clearly moving as it speaks in a smooth, cynical voice: 'The case was cold, colder than a fish in winter. But every chicken has its secrets, and I, for one, intended to find them '."
        },
        "usage": {
            "video_count": 1,
            "video_duration": 0,
            "video_ratio": "",
            "duration": 10,
            "size": "1280*720",
            "input_video_duration": 0,
            "output_video_duration": 10,
            "SR": 720
        }
    }
    ```
    

### Java SDK

**Important**

-   The SDK supports wan2.6 and earlier. **wan2.7 is not supported.**
    
-   DashScope Java SDK version **2.22.6** or later is required.
    
    Older versions may return "url error, please check url!". To update, see [Install the SDK](/help/en/model-studio/install-sdk).
    

Set **Constants.baseHttpApiUrl** to the region endpoint:

## **Singapore**

`Constants.baseHttpApiUrl = "https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1";`

## **Virginia**

`Constants.baseHttpApiUrl = "https://dashscope-us.aliyuncs.com/api/v1";`

## **Beijing**

`Constants.baseHttpApiUrl = "https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api/v1";`

Replace `{WorkspaceId}` with your actual [workspace ID](/help/en/model-studio/obtain-the-app-id-and-workspace-id#d3eb3cd37b7fu).

## **Synchronous invocation**

##### Request example

```
// Copyright (c) Alibaba, Inc. and its affiliates.

// dashscope SDK version 2.18.2 or later
import com.alibaba.dashscope.aigc.videosynthesis.VideoSynthesis;
import com.alibaba.dashscope.aigc.videosynthesis.VideoSynthesisParam;
import com.alibaba.dashscope.aigc.videosynthesis.VideoSynthesisResult;
import com.alibaba.dashscope.exception.ApiException;
import com.alibaba.dashscope.exception.InputRequiredException;
import com.alibaba.dashscope.exception.NoApiKeyException;
import com.alibaba.dashscope.utils.JsonUtils;
import com.alibaba.dashscope.utils.Constants;

import java.util.HashMap;
import java.util.Map;

public class Text2Video {

    static {
        // Singapore region URL. URLs vary by region. For more information, see https://www.alibabacloud.com/help/en/model-studio/text-to-video-api-reference.
        Constants.baseHttpApiUrl = "https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1";
    }
    
    // If no environment variable is configured, replace the value with your Model Studio API key: apiKey = "sk-xxx".
    // API keys vary by region. For more information, see https://www.alibabacloud.com/help/en/model-studio/get-api-key.
    public static String apiKey = System.getenv("DASHSCOPE_API_KEY");

    public static void text2Video() throws ApiException, NoApiKeyException, InputRequiredException {
        VideoSynthesis vs = new VideoSynthesis();
        Map<String, Object> parameters = new HashMap<>();
        parameters.put("prompt_extend", true);
        parameters.put("watermark", false);
        parameters.put("seed", 12345);

        VideoSynthesisParam param =
                VideoSynthesisParam.builder()
                        .apiKey(apiKey)
                        .model("wan2.6-t2v")
                        .prompt("Shot from a low angle, in a medium close-up, with warm tones, mixed lighting (the practical light from the desk lamp blends with the overcast light from the window), side lighting, and a central composition. In a classic detective office, wooden bookshelves are filled with old case files and ashtrays. A green desk lamp illuminates a case file spread out in the center of the desk. A fox, wearing a dark brown trench coat and a light gray fedora, sits in a leather chair, its fur crimson, its tail resting lightly on the edge, its fingers slowly turning yellowed pages. Outside, a steady drizzle falls beneath a blue sky, streaking the glass with meandering streaks. It slowly raises its head, its ears twitching slightly, its amber eyes gazing directly at the camera, its mouth clearly moving as it speaks in a smooth, cynical voice: 'The case was cold, colder than a fish in winter. But every chicken has its secrets, and I, for one, intended to find them'.")
                        .audioUrl("https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20250929/stjqnq/%E7%8B%90%E7%8B%B8.mp3")
                        .negativePrompt("")
                        .size("1280*720")
                        .duration(10)
                        .parameters(parameters)
                        .build();
        System.out.println("Please wait...");
        VideoSynthesisResult result = vs.call(param);
        System.out.println(JsonUtils.toJson(result));
    }

    public static void main(String[] args) {
        try {
            text2Video();
        } catch (ApiException | NoApiKeyException | InputRequiredException e) {
            System.out.println(e.getMessage());
        }
        System.exit(0);
    }
}
```

##### Response example

> The video\_url expires after 24 hours. Download promptly.

```
{
    "request_id": "c1209113-8437-424f-a386-xxxxxx",
    "output": {
        "task_id": "966cebcd-dedc-4962-af88-xxxxxx",
        "task_status": "SUCCEEDED",
        "video_url": "https://dashscope-result-sh.oss-accelerate.aliyuncs.com/xxx.mp4?Expires=xxx",
        "orig_prompt": "Shot from a low angle, in a medium close-up, with warm tones, mixed lighting (the practical light from the desk lamp blends with the overcast light from the window), side lighting, and a central composition. In a classic detective office, wooden bookshelves are filled with old case files and ashtrays. A green desk lamp illuminates a case file spread out in the center of the desk. A fox, wearing a dark brown trench coat and a light gray fedora, sits in a leather chair, its fur crimson, its tail resting lightly on the edge, its fingers slowly turning yellowed pages. Outside, a steady drizzle falls beneath a blue sky, streaking the glass with meandering streaks. It slowly raises its head, its ears twitching slightly, its amber eyes gazing directly at the camera, its mouth clearly moving as it speaks in a smooth, cynical voice: 'The case was cold, colder than a fish in winter. But every chicken has its secrets, and I, for one, intended to find them '",
        "submit_time": "2026-01-22 23:13:40.553",
        "scheduled_time": "2026-01-22 23:13:49.415",
        "end_time": "2026-01-22 23:17:56.380"
    },
    "usage": {
        "video_count": 1,
        "duration": 10.0,
        "size": "1280*720",
        "input_video_duration": 0.0,
        "output_video_duration": 10.0,
        "SR": "720"
    },
    "status_code": 200,
    "code": "",
    "message": ""
}
```

## **Asynchronous invocation**

##### Request example

```
// Copyright (c) Alibaba, Inc. and its affiliates.

import com.alibaba.dashscope.aigc.videosynthesis.VideoSynthesis;
import com.alibaba.dashscope.aigc.videosynthesis.VideoSynthesisListResult;
import com.alibaba.dashscope.aigc.videosynthesis.VideoSynthesisParam;
import com.alibaba.dashscope.aigc.videosynthesis.VideoSynthesisResult;
import com.alibaba.dashscope.exception.ApiException;
import com.alibaba.dashscope.exception.InputRequiredException;
import com.alibaba.dashscope.exception.NoApiKeyException;
import com.alibaba.dashscope.task.AsyncTaskListParam;
import com.alibaba.dashscope.utils.JsonUtils;
import com.alibaba.dashscope.utils.Constants;

import java.util.HashMap;
import java.util.Map;

public class Text2Video {
    static {
        // The URL for the Singapore region. URLs vary by region. For more information, see https://www.alibabacloud.com/help/en/model-studio/text-to-video-api-reference
        Constants.baseHttpApiUrl="https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1";
    }

     // If an environment variable is not set, replace the placeholder with your Model Studio API key, for example: apiKey="sk-xxx"
    // API keys vary by region. For more information, see https://www.alibabacloud.com/help/en/model-studio/get-api-key
    public static String apiKey = System.getenv("DASHSCOPE_API_KEY");

    public static void text2Video() throws ApiException, NoApiKeyException, InputRequiredException {
        VideoSynthesis vs = new VideoSynthesis();
        Map<String, Object> parameters = new HashMap<>();
        parameters.put("prompt_extend", true);
        parameters.put("watermark", false);
        parameters.put("seed", 12345);

        VideoSynthesisParam param =
                VideoSynthesisParam.builder()
                        .apiKey(apiKey)
                        .model("wan2.6-t2v")
                        .prompt("Shot from a low angle, in a medium close-up, with warm tones, mixed lighting (the practical light from the desk lamp blends with the overcast light from the window), side lighting, and a central composition. In a classic detective office, wooden bookshelves are filled with old case files and ashtrays. A green desk lamp illuminates a case file spread out in the center of the desk. A fox, wearing a dark brown trench coat and a light gray fedora, sits in a leather chair, its fur crimson, its tail resting lightly on the edge, its fingers slowly turning yellowed pages. Outside, a steady drizzle falls beneath a blue sky, streaking the glass with meandering streaks. It slowly raises its head, its ears twitching slightly, its amber eyes gazing directly at the camera, its mouth clearly moving as it speaks in a smooth, cynical voice: 'The case was cold, colder than a fish in winter. But every chicken has its secrets, and I, for one, intended to find them '.")
                        .audioUrl("https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20250929/stjqnq/%E7%8B%90%E7%8B%B8.mp3")
                        .negativePrompt("")
                        .size("1280*720")
                        .duration(10)
                        .parameters(parameters)
                        .build();

        // Make an asynchronous call.
        VideoSynthesisResult task = vs.asyncCall(param);
        System.out.println(JsonUtils.toJson(task));
        System.out.println("please wait...");

        // Retrieve the result.
        VideoSynthesisResult result = vs.wait(task, apiKey);
        System.out.println(JsonUtils.toJson(result));
    }

     // Retrieve the task list.
    public static void listTask() throws ApiException, NoApiKeyException {
        VideoSynthesis is = new VideoSynthesis();
        AsyncTaskListParam param = AsyncTaskListParam.builder().build();
        param.setApiKey(apiKey);
        VideoSynthesisListResult result = is.list(param);
        System.out.println(result);
    }

    // Retrieve the result of a single task.
    public static void fetchTask(String taskId) throws ApiException, NoApiKeyException {
        VideoSynthesis is = new VideoSynthesis();
        // If you set the DASHSCOPE_API_KEY environment variable, you can set apiKey to null.
        VideoSynthesisResult result = is.fetch(taskId, apiKey);
        System.out.println(result.getOutput());
        System.out.println(result.getUsage());
    }

    public static void main(String[] args) {
        try {
            text2Video();
        } catch (ApiException | NoApiKeyException | InputRequiredException e) {
            System.out.println(e.getMessage());
        }
        System.exit(0);
    }
}
```

##### Response example

1.  Task creation response example.
    
    ```
    {
            "request_id": "5dbf9dc5-4f4c-9605-85ea-xxxxxxxx",
    	"output": {
    		"task_id": "7277e20e-aa01-4709-xxxxxxxx",
    		"task_status": "PENDING"
    	}
    }
    ```
    
2.  Task query response example
    
    > The video\_url expires after 24 hours. Download promptly.
    
    ```
    {
        "request_id": "c1209113-8437-424f-a386-xxxxxx",
        "output": {
            "task_id": "966cebcd-dedc-4962-af88-xxxxxx",
            "task_status": "SUCCEEDED",
            "video_url": "https://dashscope-result-sh.oss-accelerate.aliyuncs.com/xxx.mp4?Expires=xxx",
            "orig_prompt": "Shot from a low angle, in a medium close-up, with warm tones, mixed lighting (the practical light from the desk lamp blends with the overcast light from the window), side lighting, and a central composition. In a classic detective office, wooden bookshelves are filled with old case files and ashtrays. A green desk lamp illuminates a case file spread out in the center of the desk. A fox, wearing a dark brown trench coat and a light gray fedora, sits in a leather chair, its fur crimson, its tail resting lightly on the edge, its fingers slowly turning yellowed pages. Outside, a steady drizzle falls beneath a blue sky, streaking the glass with meandering streaks. It slowly raises its head, its ears twitching slightly, its amber eyes gazing directly at the camera, its mouth clearly moving as it speaks in a smooth, cynical voice: 'The case was cold, colder than a fish in winter. But every chicken has its secrets, and I, for one, intended to find them '",
            "submit_time": "2026-01-22 23:13:40.553",
            "scheduled_time": "2026-01-22 23:13:49.415",
            "end_time": "2026-01-22 23:17:56.380"
        },
        "usage": {
            "video_count": 1,
            "duration": 10.0,
            "size": "1280*720",
            "input_video_duration": 0.0,
            "output_video_duration": 10.0,
            "SR": "720"
        },
        "status_code": 200,
        "code": "",
        "message": ""
    }
    ```
    

## **Limitations**

-   **Data retention**: The task ID (`task_id`) and video URL (`video_url`) expire after 24 hours. After expiry, they cannot be queried or downloaded.
    
-   **Content moderation**: Input and output undergo content moderation. Prohibited content triggers "IPInfringementSuspect" or "DataInspectionFailed" errors. See [Error codes](/help/en/model-studio/error-code).
    

## **Error codes**

If the model call fails and returns an error message, see [Error codes](/help/en/model-studio/error-code) for resolution.

## **FAQ**

#### **Q: What code changes are needed to upgrade from wan2.6 to wan2.7?**

A: Two changes are required:

-   **Resolution control**: wan2.7 replaces the `size` field. Instead, it uses a combination of `resolution` (resolution tier) and `ratio` (aspect ratio) to define output resolution. Earlier models used the `size` field.
    
-   **Shot type removal**: wan2.7 drops the `shot_type` field. Describe shot structure directly in the prompt instead.
    

#### **Q: How do I convert a temporary video link to a permanent one?**

A: Direct conversion is not possible. Download the video from the URL, then upload it to persistent storage (such as Alibaba Cloud OSS) to generate a permanent link.

**Example code: Download a video to a local device**

```
import requests

def download_and_save_video(video_url, save_path):
    try:
        response = requests.get(video_url, stream=True, timeout=300)
        response.raise_for_status()
        with open(save_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        print(f"Video successfully downloaded to: {save_path}")
        # You can add logic to upload the video to permanent storage here
    except requests.exceptions.RequestException as e:
        print(f"Failed to download video: {e}")

if __name__ == '__main__':
    video_url = "http://dashscope-result-sh.oss-cn-shanghai.aliyuncs.com/xxxx"
    save_path = "video.mp4"
    download_and_save_video(video_url, save_path)
```

#### **Q: Can the returned video link be played directly in a browser?**

A: No. The link expires after 24 hours. Download the video, store it persistently, and use a permanent link for playback.

/\* Adjust table width \*/ .aliyun-docs-content table.medium-width { max-width: 1018px; width: 100%; } .aliyun-docs-content table.table-no-border tr td:first-child { padding-left: 0; } .aliyun-docs-content table.table-no-border tr td:last-child { padding-right: 0; } /\* Support sticky positioning \*/ div:has(.aliyun-docs-content), .aliyun-docs-content .markdown-body { overflow: visible; } .stick-top { position: sticky; top: 46px; } /\*\* Code block font \*\*/ /\* Reduce code block margin in tables to make table information more compact \*/ .unionContainer .markdown-body table .help-code-block { margin: 0 !important; } /\* Reduce code block font size in tables to make table information more compact \*/ .unionContainer .markdown-body .help-code-block pre { font-size: 12px !important; } /\* Reduce code block font size in tables to make table information more compact \*/ .unionContainer .markdown-body .help-code-block pre code { font-size: 12px !important; } /\*\* API Reference tables \*\*/ .aliyun-docs-content table.api-reference tr td:first-child { margin: 0px; border-bottom: 1px solid #d8d8d8; } .aliyun-docs-content table.api-reference tr:last-child td:first-child { border-bottom: none; } .aliyun-docs-content table.api-reference p { color: #6e6e80; } .aliyun-docs-content table.api-reference b, i { color: #181818; } .aliyun-docs-content table.api-reference .collapse { border: none; margin-top: 4px; margin-bottom: 4px; } .aliyun-docs-content table.api-reference .collapse .expandable-title-bold { padding: 0; } .aliyun-docs-content table.api-reference .collapse .expandable-title { padding: 0; } .aliyun-docs-content table.api-reference .collapse .expandable-title-bold .title { margin-left: 16px; } .aliyun-docs-content table.api-reference .collapse .expandable-title .title { margin-left: 16px; } .aliyun-docs-content table.api-reference .collapse .expandable-title-bold i.icon { position: absolute; color: #777; font-weight: 100; } .aliyun-docs-content table.api-reference .collapse .expandable-title i.icon { position: absolute; color: #777; font-weight: 100; } .aliyun-docs-content table.api-reference .collapse.expanded .expandable-content { padding: 10px 14px 10px 14px !important; margin: 0; border: 1px solid #e9e9e9; } .aliyun-docs-content table.api-reference .collapse .expandable-title-bold b { font-size: 13px; font-weight: normal; color: #6e6e80; } .aliyun-docs-content table.api-reference .collapse .expandable-title b { font-size: 13px; font-weight: normal; color: #6e6e80; } .aliyun-docs-content table.api-reference .tabbed-content-box { border: none; } .aliyun-docs-content table.api-reference .tabbed-content-box section { padding: 8px 0 !important; } .aliyun-docs-content table.api-reference .tabbed-content-box.mini .tab-box { /\* position: absolute; left: 40px; right: 0; \*/ } .aliyun-docs-content .margin-top-33 { margin-top: 33px !important; } .aliyun-docs-content .two-codeblocks pre { max-height: calc(50vh - 136px) !important; height: auto; } .expandable-content section { border-bottom: 1px solid #e9e9e9; padding-top: 6px; padding-bottom: 4px; } .expandable-content section:last-child { border-bottom: none; } .expandable-content section:first-child { padding-top: 0; }

/\* ========================================= \*/ /\* 新增样式：带边框的表格 (api-table-border) \*/ /\* ========================================= \*/ /\* 1. 表格容器核心设置 \*/ .aliyun-docs-content table.api-table-border { border: 1px solid #d8d8d8 !important; /\* 表格外边框 \*/ border-collapse: collapse !important; /\* 合并边框，防止双线 \*/ width: 100% !important; /\* 宽度占满 \*/ margin: 10px 0 !important; /\* 上下间距 \*/ background-color: #fff !important; /\* 背景色 \*/ box-sizing: border-box !important; } /\* 2. 表头、表体、行设置 \*/ /\* 确保行本身没有干扰边框 \*/ .aliyun-docs-content table.api-table-border thead, .aliyun-docs-content table.api-table-border tbody, .aliyun-docs-content table.api-table-border tr { border: none !important; background-color: transparent !important; } /\* 3. 单元格设置 (th 和 td) \*/ /\* 这是边框显示的关键位置 \*/ .aliyun-docs-content table.api-table-border th, .aliyun-docs-content table.api-table-border td { border: 1px solid #d8d8d8 !important; /\* 单元格四周边框 \*/ padding: 8px 12px !important; /\* 内边距 \*/ text-align: left !important; /\* 文字左对齐 \*/ vertical-align: middle !important; /\* 垂直居中 \*/ color: #6e6e80 !important; /\* 文字颜色 \*/ font-size: 14px !important; /\* 字体大小 \*/ line-height: 1.5 !important; } /\* 4. 表头特殊样式 \*/ .aliyun-docs-content table.api-table-border th { background-color: #f9fafb !important; /\* 表头背景色 \*/ color: #181818 !important; /\* 表头文字颜色 \*/ font-weight: 600 !important; /\* 表头加粗 \*/ } /\* 5. 鼠标悬停效果 (可选) \*/ .aliyun-docs-content table.api-table-border tbody tr:hover td { background-color: #fcfcfc !important; /\* 悬停时背景微变 \*/ } /\* 6. 兼容原有 api-reference 可能存在的冲突 \*/ /\* 如果原有样式针对 td:first-child 等特殊选择器有干扰，这里强制覆盖 \*/ .aliyun-docs-content table.api-table-border tr td:first-child { border-bottom: 1px solid #d8d8d8 !important; margin: 0 !important; } .aliyun-docs-content table.api-table-border tr:last-child td:first-child { border-bottom: 1px solid #d8d8d8 !important; /\* 保持底部边框 \*/ }


Wan-R2V accepts **multimodal input** (images, videos, and audio) to generate videos featuring one or more characters while preserving their appearance and voice across scenes.

**References**: [User guide](/help/en/model-studio/video-to-video-guide)

## Availability

To ensure successful API calls, the model, endpoint URL, and API key must all belong to the **same region**. Cross-region calls will fail.

-   [Select a model](/help/en/model-studio/video-to-video-guide#06f39eafa2dwt): Confirm the model's region.
    
-   **Select a URL**: Choose the endpoint URL for the corresponding region. HTTP URLs are supported.
    
-   **Configure an API key**: Select a region, [get an API key](/help/en/model-studio/get-api-key), and [configure the API key as an environment variable](/help/en/model-studio/configure-api-key-through-environment-variables).
    

**Note**

The sample code in this topic applies to the **Singapore** region.

**Important**

Model Studio has released workspace-specific domains for the China (Beijing) and Singapore regions. **The new dedicated domains deliver superior performance and higher stability for inference requests**. We recommend migrating to the new domains:

-   China (Beijing): from `https://dashscope.aliyuncs.com` to `https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com`
    
-   Singapore: from `https://dashscope-intl.aliyuncs.com` to `https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com`
    

`{WorkspaceId}` is your workspace ID, which can be found on the **Workspace Details** page in the Model Studio console. The existing domain remains fully functional.

## HTTP

**Important**

This API uses the **new protocol** and supports the **wan2.7 model**.

Video generation typically takes 1 to 5 minutes, so the API uses asynchronous invocation. The workflow has two steps: **create a task**, then **poll for the result**.

### **Step 1: Create a task and get the task ID**

## **Singapore**

`POST https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis`

## **Beijing**

`POST https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis`

Replace `{WorkspaceId}` with your actual [workspace ID](/help/en/model-studio/obtain-the-app-id-and-workspace-id#d3eb3cd37b7fu).

**Note**

-   After the task is created, use the returned `task_id` to query the result. The `task_id` is valid for 24 hours. **Do not create duplicate tasks**. Instead, use polling to retrieve the result.
    
-   For guidance for beginners, see [Call APIs with Postman or cURL](/help/en/model-studio/first-call-to-image-and-video-api).
    

| #### Request parameters | ## Multi-subject reference (image + video + voice) You can pass multiple reference assets (images and videos) and specify a voice to generate a video. ``` curl --location 'https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis' \\ -H 'X-DashScope-Async: enable' \\ -H "Authorization: Bearer $DASHSCOPE_API_KEY" \\ -H 'Content-Type: application/json' \\ -d '{ "model": "wan2.7-r2v-2026-06-12", "input": { "prompt": "Video 1 holds Image 3, plays a soothing country folk song on the chair from Image 4, and says, '\\''The sunshine is so nice today.'\\'' Image 1, holding Image 2, walks past Video 1, places Image 2 on the table next to it, and says, '\\''That sounds lovely. Can you sing it again?'\\''", "media": [ { "type": "reference_image", "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260408/sjuytr/wan-r2v-object-girl.jpg", "reference_voice": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260408/gbqewz/wan-r2v-girl-voice.mp3" }, { "type": "reference_video", "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260129/qigswt/wan-r2v-role2.mp4", "reference_voice": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260408/isllrq/wan-r2v-boy-voice.mp3" }, { "type": "reference_image", "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260129/rtjeqf/wan-r2v-object3.png" }, { "type": "reference_image", "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260129/qpzxps/wan-r2v-object4.png" }, { "type": "reference_image", "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260129/wfjikw/wan-r2v-backgroud5.png" } ] }, "parameters": { "resolution": "720P", "ratio": "16:9", "duration": 10, "prompt_extend": false, "watermark": true } }' ``` ## Single-image reference (multi-panel image) You can provide a nine-panel reference image to control the story, camera composition, and character design to generate a video. ``` curl --location 'https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis' \\ -H 'X-DashScope-Async: enable' \\ -H "Authorization: Bearer $DASHSCOPE_API_KEY" \\ -H 'Content-Type: application/json' \\ -d '{ "model": "wan2.7-r2v-2026-06-12", "input": { "prompt": "Based on the reference image, in the style of a 3D cartoon adventure movie. The characters are in a cute Q-style but with detailed textures, smooth movements, and vibrant colors. Keep the characters and the forest scene consistent. Do not add text. Atmosphere: Adventurous, light-hearted, mysterious, whimsical. Characters: A young boy explorer with a round hat, backpack, and short cloak. His sidekick: a small flying robot with a round body and glowing blue eyes. Scene: A magical forest with giant tree roots, mushrooms, vines, a treasure cave entrance, and sunbeams. Storyboard: 1. Wide shot: Tall trees and intersecting sunbeams in the magical forest, creating a mysterious and bright environment. 2. Medium shot: The little boy pushes aside vines to explore forward. 3. Medium shot: The little robot flies beside him, scanning ahead with its blue light. 4. Close-up: An old treasure map unfolds in his hands. 5. Close-up: His face lights up with excitement. 6. Action shot: The two jump over tree roots and a small stream, venturing deeper into the forest. 7. Medium shot: A moss-covered treasure chest is revealed behind the vines. 8. Close-up: A golden glow emanates from the edge of the chest. 9. Final shot: The boy and the robot stand before the chest, looking at each other in surprise, filled with a sense of adventure.", "media": [ { "type": "reference_image", "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260403/wgjaxy/banana_storyboard_00000020.png" } ] }, "parameters": { "resolution": "720P", "duration": 10, "prompt_extend": false, "watermark": true } }' ``` |
| --- | --- |
| ##### Headers |
| **Content-Type** `*string*` **(Required)** The content type of the request. Must be `application/json`. |
| **Authorization** `*string*` **(Required)** Authenticates the request with a Model Studio API key. Example: Bearer sk-xxxx. |
| **X-DashScope-Async** `*string*` **(Required)** Enables asynchronous processing. HTTP requests support only asynchronous calls. Must be `enable`. **Important** If this request header is missing, the error "current user api does not support synchronous calls" is returned. |
| ##### Request body |
| **model** `*string*` **(Required)** The model name. For a list of models and their prices, see [Model pricing](/help/en/model-studio/model-pricing#5c3d28ad8a4x8). Example: wan2.7-r2v, wan2.7-r2v-2026-06-12. |
| **input** `*object*` **(Required)** The basic input information, such as the prompt. **Properties** **prompt** `*string*` **(Required)** The text prompt describing the desired elements and visual features of the generated video. Supports Chinese and English. Each Chinese character, letter, and punctuation mark counts as one character. Text exceeding the limit is automatically truncated. - wan2.7-r2v, wan2.7-r2v-2026-06-12: Up to 5,000 characters. **Reference identifiers**: In prompts, use identifiers such as "**Image 1, Image 2**" for images and "**Video 1, Video 2**" for videos. Include a space between the word and the number, and capitalize the first letter. The order of identifiers must match the order of assets in the `media` array. Images and videos are counted separately, so "Image 1" and "Video 1" can coexist. If there is only one reference image or video, simplify the reference to "**the reference image**" or "**the reference video**". **Scene description**: For example, if reference Image 1 is a cat and Image 2 is a room. To describe the cat playing in the room, you can use two methods. One is to directly use the identifiers, such as "Image 1 is playing in Image 2". The other is to supplement the description with the subject and scene, such as "The cat from Image 1 is playing in the room from Image 2". When the reference image is a multi-panel storyboard, describe the scene in a multi-shot format in the prompt. You do not need to describe every panel — provide key shots, and the model automatically recognizes the panel logic and completes the remaining scenes. For best results, use only one multi-panel image at a time. For tips on using prompts, see [Text-to-video/image-to-video prompt guide](/help/en/model-studio/text-to-video-prompt). **negative\\_prompt** `*string*` (Optional) A negative prompt describing content to exclude from the generated video. Use this to constrain the output. Supports Chinese and English. Maximum length: 500 characters. Text exceeding the limit is automatically truncated. Example: low resolution, error, worst quality, low quality, disfigured, extra fingers, bad proportions. **media** `*array*` **(Required)** An array of media assets (images, videos, and audio) used as visual and audio references. Images can include multiple views, commonly used for referencing characters, props, and scenes. - Each element in the array is a media object that contains `type` and `url` fields. - The order of elements in the array corresponds to the reference identifiers in the `prompt`. Images and videos are counted separately, so "Image 1" and "Video 1" can coexist. - The first `reference_video` in the array corresponds to **Video 1**, the second to **Video 2**, and so on. - The first `reference_image` in the array corresponds to **Image 1**, the second to **Image 2**, and so on. **Properties** **type** `*string*` **(Required)** The type of the media asset. Valid values: - `reference_image`: A reference image that provides the visual reference for a main character (person, animal, or object) or scene. - `reference_video`: A reference video that provides the visual and voice reference for a main character (person, animal, or object). Avoid using videos of empty scenes. - `first_frame`: The first frame of the video. The generated video starts from this frame, which typically contains the main character (person, animal, or object). You can combine a first frame with subject references for joint control. Common use cases: - The subject already appears in the first frame: Use a subject reference to enhance consistency or add a voice reference. - The subject does not appear in the first frame: Use a subject reference to define the features of a new subject that appears during the video. Asset limits: - A maximum of 1 first frame image. - At least 1 reference image or reference video. **Reference images + Reference videos ≤ 5**. - When used for a main character, the reference asset must contain only a single character. **url** `*string*` **(Required)** The URL of the media asset. Each value can point to **one image or one video**. Pass a reference image (type=reference\\_image) The URL or Base64-encoded data of the reference image. The image can be a subject (person, animal, or object) or a background. When it includes a subject, it must contain only one character. Image limits: - Formats: JPEG, JPG, PNG (the alpha channel is not supported), BMP, or WEBP. - Resolution: The width and height must be between 240 and 8,000 pixels. - Aspect ratio: 1:8 to 8:1. - File size: Up to 20 MB. Supported input formats: 1. Public URL: - The HTTP or HTTPS protocol is supported. - Example: https://xxx/xxx.png. 2. Base64-encoded image string: - Data format: `data:{MIME_type};base64,{base64_data}`. - Example: data:image/png;base64,GDU7MtCZzEbTbmRZ...... (The encoded string is too long and only a snippet is shown.) - For more information, see [Pass an image](/help/en/model-studio/image-to-video-guide#32d9db99f1fk0). Pass a reference video (type=reference\\_video) The URL of the reference video. The video should include a subject (person, animal, or object). Avoid using videos of backgrounds or empty scenes. When the video includes a subject, it must contain only one character. If the video has audio, the voice can also be referenced. Video limits: - Formats: MP4 or MOV. - Duration: 1 to 30s. - Resolution: The width and height must be between 240 and 4,096 pixels. - Aspect ratio: 1:8 to 8:1. - File size: Up to 100 MB. Supported input formats: 1. Public URL: - The HTTP and HTTPS protocols are supported. - Example: https://xxx/xxx.mp4. **reference\\_voice** `*string*` **(Optional)** The audio URL specifying the voice for the main character in the reference asset (image or video). Use this parameter with `reference_image` or `reference_video`. The audio serves only as a voice reference and does not determine spoken content. For best results, match the language of the reference audio to the language of the prompt. Audio logic: - Default behavior: If `reference_video` contains audio but `reference_voice` is not specified, the original video audio is used. - Priority: If both `reference_video` (with audio) and `reference_voice` are provided, `reference_voice` takes precedence and overrides the original video audio. Audio limits: - Formats: WAV or MP3. - Duration: 1 to 10s. - File size: Up to 15 MB. Supported input formats: 1. Public URL: - The HTTP and HTTPS protocols are supported. - Example: https://xxx/xxx.mp3. |
| **parameters** `*object*` (Optional) The video processing parameters, such as the video resolution. **Properties** **resolution** `*string*` (Optional) **Important** The `resolution` directly affects cost. Confirm the price in the Model Studio console before making a call. The resolution tier of the generated video. Controls the total pixel count. - wan2.7-r2v, wan2.7-r2v-2026-06-12: Valid values are 720P and 1080P. The default value is `1080P`. **ratio** `*string*` (Optional) The aspect ratio of the generated video. Behavior: - No first frame image provided: The video uses the specified `ratio`. - First frame image provided: The `ratio` parameter is ignored. The video matches the aspect ratio of the first frame image. Valid values: - `16:9` (default) - `9:16` - `1:1` - `4:3` - `3:4` **duration** `*integer*` (Optional) **Important** Duration directly affects cost. Confirm the [model pricing](/help/en/model-studio/model-pricing#5c3d28ad8a4x8) before calling the API. The duration of the generated video in seconds. - wan2.7-r2v, wan2.7-r2v-2026-06-12: The default value is 5. - If the reference material includes a video, the value must be an integer from 2 to 10. - If the reference material does not include a video, the value must be an integer from 2 to 15. **prompt\\_extend** `*boolean*` (Optional) Enables prompt rewriting. When enabled, a model rewrites the input prompt before generation. This significantly improves quality for shorter prompts but increases processing time. - true (default) - false **watermark** `*boolean*` (Optional) Adds a watermark. The watermark text is "AI Generated", placed in the lower-right corner of the video. - `false` (default) - `true` **seed** `*integer*` (Optional) The random number seed must be an integer in the range `[0, 2147483647]`. If not specified, a random seed is generated. A fixed seed improves reproducibility. Because model generation is probabilistic, the same seed does not guarantee identical results. |
|     |     |

| #### Response parameters | ### Successful response Save the `task_id` to query the task status and result. ``` { "output": { "task_status": "PENDING", "task_id": "0385dc79-5ff8-4d82-bcb6-xxxxxx" }, "request_id": "4909100c-7b5a-9f92-bfe5-xxxxxx" } ``` ### Error response Task creation failed. See [Error codes](/help/en/model-studio/error-code). ``` { "code": "InvalidApiKey", "message": "No API-key provided.", "request_id": "7438d53d-6eb8-4596-8835-xxxxxx" } ``` |
| --- | --- |
| **output** `*object*` The output information of the task. **Properties** **task\\_id** `*string*` The task ID. Valid for queries for 24 hours. **task\\_status** `*string*` The status of the task. **Enumeration values** - PENDING - RUNNING - SUCCEEDED - FAILED - CANCELED - UNKNOWN: The task does not exist or its status is unknown. |
| **request\\_id** `*string*` Unique request identifier for tracing and troubleshooting. |
| **code** `*string*` Error code. Returned only for failed requests. See [Error codes](/help/en/model-studio/error-code). |
| **message** `*string*` Detailed error message. Returned only for failed requests. See [Error codes](/help/en/model-studio/error-code). |

### **Step 2: Query the result by task ID**

## **Singapore**

`GET https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/tasks/{task_id}`

## **Beijing**

`GET https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api/v1/tasks/{task_id}`

Replace `{WorkspaceId}` with your actual [workspace ID](/help/en/model-studio/obtain-the-app-id-and-workspace-id#d3eb3cd37b7fu).

**Note**

-   **Polling recommendation**: Video generation takes several minutes. Use a polling mechanism with a reasonable interval, such as 15 seconds.
    
-   **Task state transition**: PENDING → RUNNING → SUCCEEDED or FAILED.
    
-   **Result link**: After a task succeeds, a video URL valid for **24 hours** is returned. Download and save the video to permanent storage, such as [OSS](/help/en/oss/user-guide/what-is-oss).
    
-   `**task_id**` **validity**: **24 hours**. After this period, queries return the task status as `UNKNOWN`.
    

| #### Request parameters | ## Query the task result Replace `{task_id}` with the `task_id` value returned by the previous API call. The `task_id` is valid for queries for 24 hours. ``` curl -X GET https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1/tasks/{task_id} \\ --header "Authorization: Bearer $DASHSCOPE_API_KEY" ``` |
| --- | --- |
| ##### **Headers** |
| **Authorization** `*string*` **(Required)** Authenticates the request with a Model Studio API key. Example: Bearer sk-xxxx. |
| ##### **Path parameters** |
| **task\\_id** `*string*` **(Required)** The ID of the task. |

| #### **Response parameters** | #### **Task succeeded** Video URLs are valid for only 24 hours and then automatically purged. Save generated videos promptly. ``` { "request_id": "52cade0d-905e-9b7d-a01e-xxxxxx", "output": { "task_id": "18814247-f944-4102-aa4a-xxxxxx", "task_status": "SUCCEEDED", "submit_time": "2026-04-02 22:53:19.537", "scheduled_time": "2026-04-02 22:53:30.427", "end_time": "2026-04-02 23:00:39.287", "orig_prompt": "Video 2 holds Image 3 and plays a soothing American country ballad in a coffee shop, while Video 1 smiles, watches Video 2, and slowly walks towards him", "video_url": "https://dashscope-a717.oss-accelerate.aliyuncs.com/xxx.mp4?xxxx" }, "usage": { "duration": 15, "input_video_duration": 5, "output_video_duration": 10, "video_count": 1, "SR": 720, "ratio": "16:9" } } ``` ## Task failed When a task fails, `task_status` is FAILED with an error code and message. See [Error codes](/help/en/model-studio/error-code). ``` { "request_id": "e5d70b02-ebd3-98ce-9fe8-759d7d7b107d", "output": { "task_id": "86ecf553-d340-4e21-af6e-a0c6a421c010", "task_status": "FAILED", "code": "InvalidParameter", "message": "The size is not match xxxxxx" } } ``` ## Task query expired The `task_id` is valid for 24 hours. After this period, queries return the following error. ``` { "request_id": "a4de7c32-7057-9f82-8581-xxxxxx", "output": { "task_id": "502a00b1-19d9-4839-a82f-xxxxxx", "task_status": "UNKNOWN" } } ``` |
| --- | --- |
| **output** `*object*` The output information of the task. **Properties** **task\\_id** `*string*` **(Required)** The ID of the task. **task\\_status** `*string*` The task status. **Enumeration values** - PENDING - RUNNING - SUCCEEDED - FAILED - CANCELED - UNKNOWN: The task does not exist or its status is unknown. **submit\\_time** `*string*` The time when the task was submitted. The time is in UTC+8 and the format is YYYY-MM-DD HH:mm:ss.SSS. **scheduled\\_time** `*string*` The time when the task was executed. The time is in UTC+8 and the format is YYYY-MM-DD HH:mm:ss.SSS. **end\\_time** `*string*` The time when the task was completed. The time is in UTC+8 and the format is YYYY-MM-DD HH:mm:ss.SSS. **video\\_url** `*string*` URL of the generated video. Returned only when `task_status` is SUCCEEDED. Valid for 24 hours. The video is in MP4 format with H.264 encoding. **orig\\_prompt** `*string*` The original input prompt, corresponding to the request parameter `prompt`. **code** `*string*` Error code. Returned only for failed requests. See [Error codes](/help/en/model-studio/error-code). **message** `*string*` Detailed error message. Returned only for failed requests. See [Error codes](/help/en/model-studio/error-code). |
| **usage** `*object*` Output statistics. Populated only for successful tasks. **Properties** **input\\_video\\_duration** `*integer*` The duration of the input video, in seconds. **output\\_video\\_duration** `*integer*` The duration of the output video, in seconds. **duration** `*integer*` The total video duration. Cost is calculated based on this value. Formula: `duration = input_video_duration + output_video_duration`. **SR** `*integer*` The resolution tier of the generated video. Example: 720. **ratio** `*string*` The aspect ratio of the generated video. Example: 16:9. **video\\_count** `*integer*` The number of generated videos. The value is always 1. |
| **request\\_id** `*string*` Unique request identifier for tracing and troubleshooting. |

## DashScope SDK

SDK parameter names are largely consistent with the [HTTP API](#7f493e3256ajz). The parameter structure is encapsulated based on language features.

Reference-to-video tasks typically take 1 to 5 minutes. The SDK wraps the HTTP asynchronous flow and supports both synchronous and asynchronous calls.

> Actual processing time depends on the queue length and service status.

### **Python SDK**

**Important**

Requires DashScope Python SDK **1.25.16** or later.

Older versions may trigger errors such as "url error, please check url!". For update instructions, see [Install the SDK](/help/en/model-studio/install-sdk).

Set **base\_http\_api\_url** based on the model's region:

## **Singapore**

`dashscope.base_http_api_url = 'https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1'`

## **Beijing**

`dashscope.base_http_api_url = 'https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api/v1'`

Replace `{WorkspaceId}` with your actual [workspace ID](/help/en/model-studio/obtain-the-app-id-and-workspace-id#d3eb3cd37b7fu).

## **Synchronous call**

A synchronous call blocks until video generation completes and returns the result directly.

##### Request example

```
from http import HTTPStatus
from dashscope import VideoSynthesis
import dashscope
import os

# The following URL is for the Singapore region. When calling, replace {WorkspaceId} with your actual workspace ID. URLs vary by region.
dashscope.base_http_api_url = 'https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1'

# If you have not configured environment variables, replace the following line with your Model Studio API key: api_key="sk-xxx"
# The API key varies by region. To get an API key, see https://www.alibabacloud.com/help/en/model-studio/get-api-key
api_key = os.getenv("DASHSCOPE_API_KEY")

def sample_sync_call_r2v():
    # Synchronous call, returns the result directly.
    print('please wait...')
    rsp = VideoSynthesis.call(
        api_key=api_key,
        model='wan2.7-r2v-2026-06-12',
        prompt='Video 1 holds Image 3, plays a soothing country folk song on the chair from Image 4, and says, "The sunshine is so nice today." Image 1, holding Image 2, walks past Video 1, places Image 2 on the table next to it, and says, "That sounds lovely. Can you sing it again?"',
        media=[
            {
                "type": "reference_image",
                "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260408/sjuytr/wan-r2v-object-girl.jpg",
                "reference_voice": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260408/gbqewz/wan-r2v-girl-voice.mp3"
            },
            {
                "type": "reference_video",
                "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260129/qigswt/wan-r2v-role2.mp4",
                "reference_voice": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260408/isllrq/wan-r2v-boy-voice.mp3"
            },
            {
                "type": "reference_image",
                "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260129/rtjeqf/wan-r2v-object3.png"
            },
            {
                "type": "reference_image",
                "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260129/qpzxps/wan-r2v-object4.png"
            },
            {
                "type": "reference_image",
                "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260129/wfjikw/wan-r2v-backgroud5.png"
            }
        ],
        resolution='720P',
        ratio='16:9',
        duration=10,
        prompt_extend=False,
        watermark=True)
    print(rsp)
    if rsp.status_code == HTTPStatus.OK:
        print(rsp.output.video_url)
    else:
        print('Failed, status_code: %s, code: %s, message: %s' %
              (rsp.status_code, rsp.code, rsp.message))

if __name__ == '__main__':
    sample_sync_call_r2v()
```

##### Response example

> The video\_url is valid for 24 hours. Download the video promptly.

```
{
    "status_code": 200,
    "request_id": "b040d446-f9b6-977f-b9ad-xxxxxx",
    "code": null,
    "message": "",
    "output": {
        "task_id": "5dab3291-393e-424d-929b-xxxxxx",
        "task_status": "SUCCEEDED",
        "video_url": "https://dashscope-a717.oss-accelerate.aliyuncs.com/xxx.mp4?Expires=xxx",
        "submit_time": "2026-04-17 17:12:49.076",
        "scheduled_time": "2026-04-17 17:13:00.384",
        "end_time": "2026-04-17 17:29:43.386",
        "orig_prompt": "Video 1 holds Image 3, plays a soothing country folk song on the chair from Image 4, and says, \"The sunshine is so nice today.\" Image 1, holding Image 2, walks past Video 1, places Image 2 on the table next to it, and says, \"That sounds lovely. Can you sing it again?\""
    },
    "usage": {
        "video_count": 1,
        "video_duration": 0,
        "video_ratio": "",
        "duration": 15,
        "input_video_duration": 5,
        "output_video_duration": 10,
        "SR": 720,
        "ratio": "16:9"
    }
}
```

## **Asynchronous call**

An asynchronous call returns a task ID immediately. Poll or wait for completion separately.

##### Request example

```
import os
from http import HTTPStatus
from dashscope import VideoSynthesis
import dashscope

# The following URL is for the Singapore region. When calling, replace {WorkspaceId} with your actual workspace ID. URLs vary by region.
dashscope.base_http_api_url = 'https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1'

# If you have not configured environment variables, replace the following line with your Model Studio API key: api_key="sk-xxx"
# The API key varies by region. To get an API key, see https://www.alibabacloud.com/help/en/model-studio/get-api-key
api_key = os.getenv("DASHSCOPE_API_KEY")

def sample_async_call_r2v():
    # Asynchronous call, returns a task_id.
    rsp = VideoSynthesis.async_call(
        api_key=api_key,
        model='wan2.7-r2v-2026-06-12',
        prompt='Video 1 holds Image 3, plays a soothing country folk song on the chair from Image 4, and says, "The sunshine is so nice today." Image 1, holding Image 2, walks past Video 1, places Image 2 on the table next to it, and says, "That sounds lovely. Can you sing it again?"',
        media=[
            {
                "type": "reference_image",
                "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260408/sjuytr/wan-r2v-object-girl.jpg",
                "reference_voice": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260408/gbqewz/wan-r2v-girl-voice.mp3"
            },
            {
                "type": "reference_video",
                "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260129/qigswt/wan-r2v-role2.mp4",
                "reference_voice": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260408/isllrq/wan-r2v-boy-voice.mp3"
            },
            {
                "type": "reference_image",
                "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260129/rtjeqf/wan-r2v-object3.png"
            },
            {
                "type": "reference_image",
                "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260129/qpzxps/wan-r2v-object4.png"
            },
            {
                "type": "reference_image",
                "url": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260129/wfjikw/wan-r2v-backgroud5.png"
            }
        ],
        resolution='720P',
        ratio='16:9',
        duration=10,
        prompt_extend=False,
        watermark=True)
    print(rsp)
    if rsp.status_code == HTTPStatus.OK:
        print("task_id: %s" % rsp.output.task_id)
    else:
        print('Failed, status_code: %s, code: %s, message: %s' %
              (rsp.status_code, rsp.code, rsp.message))

    # Get asynchronous task information.
    status = VideoSynthesis.fetch(task=rsp, api_key=api_key)
    if status.status_code == HTTPStatus.OK:
        print(status.output.task_status)
    else:
        print('Failed, status_code: %s, code: %s, message: %s' %
              (status.status_code, status.code, status.message))

    # Wait for the asynchronous task to complete.
    rsp = VideoSynthesis.wait(task=rsp, api_key=api_key)
    print(rsp)
    if rsp.status_code == HTTPStatus.OK:
        print(rsp.output.video_url)
    else:
        print('Failed, status_code: %s, code: %s, message: %s' %
              (rsp.status_code, rsp.code, rsp.message))

if __name__ == '__main__':
    sample_async_call_r2v()
```

##### **Response example**

1.  Response example for creating a task:
    
    ```
    {
        "status_code": 200,
        "request_id": "6dc3bf6c-be18-9268-9c27-xxxxxx",
        "code": "",
        "message": "",
        "output": {
            "task_id": "686391d9-7ecf-4290-a8e9-xxxxxx",
            "task_status": "PENDING",
            "video_url": ""
        },
        "usage": null
    }
    ```
    
2.  Response example for querying the task result:
    
    > The video\_url is valid for 24 hours. Download the video promptly.
    
    ```
    {
        "status_code": 200,
        "request_id": "b040d446-f9b6-977f-b9ad-xxxxxx",
        "code": null,
        "message": "",
        "output": {
            "task_id": "5dab3291-393e-424d-929b-xxxxxx",
            "task_status": "SUCCEEDED",
            "video_url": "https://dashscope-a717.oss-accelerate.aliyuncs.com/xxx.mp4?Expires=xxx",
            "submit_time": "2026-04-17 17:12:49.076",
            "scheduled_time": "2026-04-17 17:13:00.384",
            "end_time": "2026-04-17 17:29:43.386",
            "orig_prompt": "Video 1 holds Image 3, plays a soothing country folk song on the chair from Image 4, and says, \"The sunshine is so nice today.\" Image 1, holding Image 2, walks past Video 1, places Image 2 on the table next to it, and says, \"That sounds lovely. Can you sing it again?\""
        },
        "usage": {
            "video_count": 1,
            "video_duration": 0,
            "video_ratio": "",
            "duration": 15,
            "input_video_duration": 5,
            "output_video_duration": 10,
            "SR": 720,
            "ratio": "16:9"
        }
    }
    ```
    

### **Java SDK**

**Important**

Ensure that the DashScope Java SDK version is **at least 2.22.14** before you run the following code.

Older versions may trigger errors such as "url error, please check url!". For update instructions, see [Install the SDK](/help/en/model-studio/install-sdk).

Set **baseHttpApiUrl** based on the model's region:

## **Singapore**

`Constants.baseHttpApiUrl = "https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1";`

## **Beijing**

`Constants.baseHttpApiUrl = "https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/api/v1";`

Replace `{WorkspaceId}` with your actual [workspace ID](/help/en/model-studio/obtain-the-app-id-and-workspace-id#d3eb3cd37b7fu).

## **Synchronous call**

A synchronous call blocks until video generation completes and returns the result directly.

##### Request example

```
// Copyright (c) Alibaba, Inc. and its affiliates.

import com.alibaba.dashscope.aigc.videosynthesis.VideoSynthesis;
import com.alibaba.dashscope.aigc.videosynthesis.VideoSynthesisParam;
import com.alibaba.dashscope.aigc.videosynthesis.VideoSynthesisResult;
import com.alibaba.dashscope.exception.ApiException;
import com.alibaba.dashscope.exception.InputRequiredException;
import com.alibaba.dashscope.exception.NoApiKeyException;
import com.alibaba.dashscope.utils.JsonUtils;
import com.alibaba.dashscope.utils.Constants;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class Ref2Video {

    static {
        // The following URL is for the Singapore region. When calling, replace {WorkspaceId} with your actual workspace ID. URLs vary by region.
        Constants.baseHttpApiUrl = "https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1";
    }

    // If you have not configured environment variables, replace the following line with your Model Studio API key: apiKey="sk-xxx"
    // The API key varies by region. To get an API key, see https://www.alibabacloud.com/help/en/model-studio/get-api-key
    public static String apiKey = System.getenv("DASHSCOPE_API_KEY");

    public static void ref2video() throws ApiException, NoApiKeyException, InputRequiredException {
        VideoSynthesis vs = new VideoSynthesis();
        List<VideoSynthesisParam.Media> media = new ArrayList<VideoSynthesisParam.Media>(){{
            add(VideoSynthesisParam.Media.builder()
                    .url("https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260408/sjuytr/wan-r2v-object-girl.jpg")
                    .type("reference_image")
                    .referenceVoice("https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260408/gbqewz/wan-r2v-girl-voice.mp3")
                    .build());
            add(VideoSynthesisParam.Media.builder()
                    .url("https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260129/qigswt/wan-r2v-role2.mp4")
                    .type("reference_video")
                    .referenceVoice("https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260408/isllrq/wan-r2v-boy-voice.mp3")
                    .build());
            add(VideoSynthesisParam.Media.builder()
                    .url("https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260129/rtjeqf/wan-r2v-object3.png")
                    .type("reference_image")
                    .build());
            add(VideoSynthesisParam.Media.builder()
                    .url("https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260129/qpzxps/wan-r2v-object4.png")
                    .type("reference_image")
                    .build());
            add(VideoSynthesisParam.Media.builder()
                    .url("https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260129/wfjikw/wan-r2v-backgroud5.png")
                    .type("reference_image")
                    .build());
        }};
        Map<String, Object> parameters = new HashMap<>();
        parameters.put("resolution", "720P");
        parameters.put("ratio", "16:9");
        parameters.put("prompt_extend", false);
        parameters.put("watermark", true);

        VideoSynthesisParam param =
                VideoSynthesisParam.builder()
                        .apiKey(apiKey)
                        .model("wan2.7-r2v-2026-06-12")
                        .prompt("Video 1 holds Image 3, plays a soothing country folk song on the chair from Image 4, and says, \"The sunshine is so nice today.\" Image 1, holding Image 2, walks past Video 1, places Image 2 on the table next to it, and says, \"That sounds lovely. Can you sing it again?\"")
                        .media(media)
                        .duration(10)
                        .parameters(parameters)
                        .build();
        System.out.println("please wait...");
        VideoSynthesisResult result = vs.call(param);
        System.out.println(JsonUtils.toJson(result));
    }

    public static void main(String[] args) {
        try {
            ref2video();
        } catch (ApiException | NoApiKeyException | InputRequiredException e) {
            System.out.println(e.getMessage());
        }
        System.exit(0);
    }
}
```

##### Response example

> The video\_url is valid for 24 hours. Download the video promptly.

```
{
    "request_id": "f6365287-336f-9f2b-ab59-xxxxxx",
    "output": {
        "task_id": "cb7f1da5-a987-41de-b0a4-xxxxxx",
        "task_status": "SUCCEEDED",
        "video_url": "https://dashscope-a717.oss-accelerate.aliyuncs.com/xxx.mp4?Expires=xxxx",
        "orig_prompt": "Video 1 holds Image 3, plays a soothing country folk song on the chair from Image 4, and says, \"The sunshine is so nice today.\" Image 1, holding Image 2, walks past Video 1, places Image 2 on the table next to it, and says, \"That sounds lovely. Can you sing it again?\"",
        "submit_time": "2026-04-17 17:15:11.536",
        "scheduled_time": "2026-04-17 17:15:20.316",
        "end_time": "2026-04-17 17:29:44.277"
    },
    "usage": {
        "video_count": 1,
        "duration": 15,
        "input_video_duration": 5,
        "output_video_duration": 10,
        "SR": 720
    },
    "status_code": 200,
    "code": "",
    "message": ""
}
```

## **Asynchronous call**

An asynchronous call returns a task ID immediately. Poll or wait for completion separately.

##### Request example

```
// Copyright (c) Alibaba, Inc. and its affiliates.

import com.alibaba.dashscope.aigc.videosynthesis.VideoSynthesis;
import com.alibaba.dashscope.aigc.videosynthesis.VideoSynthesisListResult;
import com.alibaba.dashscope.aigc.videosynthesis.VideoSynthesisParam;
import com.alibaba.dashscope.aigc.videosynthesis.VideoSynthesisResult;
import com.alibaba.dashscope.exception.ApiException;
import com.alibaba.dashscope.exception.InputRequiredException;
import com.alibaba.dashscope.exception.NoApiKeyException;
import com.alibaba.dashscope.task.AsyncTaskListParam;
import com.alibaba.dashscope.utils.JsonUtils;
import com.alibaba.dashscope.utils.Constants;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class Ref2VideoAsync {

    static {
        // The following URL is for the Singapore region. When calling, replace {WorkspaceId} with your actual workspace ID. URLs vary by region.
        Constants.baseHttpApiUrl = "https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/api/v1";
    }

    // If you have not configured environment variables, replace the following line with your Model Studio API key: apiKey="sk-xxx"
    // The API key varies by region. To get an API key, see https://www.alibabacloud.com/help/en/model-studio/get-api-key
    public static String apiKey = System.getenv("DASHSCOPE_API_KEY");

    public static void asyncRef2video() throws ApiException, NoApiKeyException, InputRequiredException, InterruptedException {
        VideoSynthesis vs = new VideoSynthesis();
        List<VideoSynthesisParam.Media> media = new ArrayList<VideoSynthesisParam.Media>(){{
            add(VideoSynthesisParam.Media.builder()
                    .url("https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260408/sjuytr/wan-r2v-object-girl.jpg")
                    .type("reference_image")
                    .referenceVoice("https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260408/gbqewz/wan-r2v-girl-voice.mp3")
                    .build());
            add(VideoSynthesisParam.Media.builder()
                    .url("https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260129/qigswt/wan-r2v-role2.mp4")
                    .type("reference_video")
                    .referenceVoice("https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260408/isllrq/wan-r2v-boy-voice.mp3")
                    .build());
            add(VideoSynthesisParam.Media.builder()
                    .url("https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260129/rtjeqf/wan-r2v-object3.png")
                    .type("reference_image")
                    .build());
            add(VideoSynthesisParam.Media.builder()
                    .url("https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260129/qpzxps/wan-r2v-object4.png")
                    .type("reference_image")
                    .build());
            add(VideoSynthesisParam.Media.builder()
                    .url("https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20260129/wfjikw/wan-r2v-backgroud5.png")
                    .type("reference_image")
                    .build());
        }};
        Map<String, Object> parameters = new HashMap<>();
        parameters.put("resolution", "720P");
        parameters.put("ratio", "16:9");
        parameters.put("prompt_extend", false);
        parameters.put("watermark", true);

        VideoSynthesisParam param =
                VideoSynthesisParam.builder()
                        .apiKey(apiKey)
                        .model("wan2.7-r2v-2026-06-12")
                        .prompt("Video 1 holds Image 3, plays a soothing country folk song on the chair from Image 4, and says, \"The sunshine is so nice today.\" Image 1, holding Image 2, walks past Video 1, places Image 2 on the table next to it, and says, \"That sounds lovely. Can you sing it again?\"")
                        .media(media)
                        .duration(10)
                        .parameters(parameters)
                        .build();
        // Submit the asynchronous task.
        VideoSynthesisResult result = vs.asyncCall(param);
        System.out.println("task_id: " + result.getOutput().getTaskId());
        System.out.println(JsonUtils.toJson(result));

        // Wait for the task to complete.
        result = vs.wait(result, null);
        System.out.println(JsonUtils.toJson(result));
    }

    public static void main(String[] args) {
        try {
            asyncRef2video();
        } catch (ApiException | NoApiKeyException | InputRequiredException | InterruptedException e) {
            System.out.println(e.getMessage());
        }
        System.exit(0);
    }
}
```

##### Response example

1.  Response example for creating a task:
    
    ```
    {
        "request_id": "5dbf9dc5-4f4c-9605-85ea-xxxxxxxx",
        "output": {
            "task_id": "7277e20e-aa01-4709-xxxxxxxx",
            "task_status": "PENDING"
        }
    }
    ```
    
2.  Response example for querying the task result:
    
    > The video\_url is valid for 24 hours. Download the video promptly.
    
    ```
    {
        "request_id": "f6365287-336f-9f2b-ab59-xxxxxx",
        "output": {
            "task_id": "cb7f1da5-a987-41de-b0a4-xxxxxx",
            "task_status": "SUCCEEDED",
            "video_url": "https://dashscope-a717.oss-accelerate.aliyuncs.com/xxx.mp4?Expires=xxxx",
            "orig_prompt": "Video 1 holds Image 3, plays a soothing country folk song on the chair from Image 4, and says, \"The sunshine is so nice today.\" Image 1, holding Image 2, walks past Video 1, places Image 2 on the table next to it, and says, \"That sounds lovely. Can you sing it again?\"",
            "submit_time": "2026-04-17 17:15:11.536",
            "scheduled_time": "2026-04-17 17:15:20.316",
            "end_time": "2026-04-17 17:29:44.277"
        },
        "usage": {
            "video_count": 1,
            "duration": 15,
            "input_video_duration": 5,
            "output_video_duration": 10,
            "SR": 720
        },
        "status_code": 200,
        "code": "",
        "message": ""
    }
    ```
    

## **Error codes**

If the model call fails and returns an error message, see [Error codes](/help/en/model-studio/error-code) for resolution.

## FAQ

#### **How do I add a voice to a subject (voice reference)?**

Only **wan2.7** supports voice reference. In the `media` object, you can pass an audio URL in the `reference_voice` parameter to specify a reference voice for a reference image or video.

```
{
    "media": [
        {
            "type": "reference_image",
            "url": "<URL of the reference image>",
            "reference_voice": "<URL of the audio>"
        },
        {
            "type": "reference_video",
            "url": "<URL of the reference video>",
            "reference_voice": "<URL of the audio>"
        }
    ]
}
```

.table-wrapper { overflow: visible !important; } /\* Adjust table width \*/ .aliyun-docs-content table.medium-width { max-width: 1018px; width: 100%; } .aliyun-docs-content table.table-no-border tr td:first-child { padding-left: 0; } .aliyun-docs-content table.table-no-border tr td:last-child { padding-right: 0; } /\* Support sticky positioning \*/ div:has(.aliyun-docs-content), .aliyun-docs-content .markdown-body { overflow: visible; } .stick-top { position: sticky; top: 46px; } /\*\* Code block font \*\*/ /\* Reduce code block margin in tables to make table information more compact \*/ .unionContainer .markdown-body table .help-code-block { margin: 0 !important; } /\* Reduce code block font size in tables to make table information more compact \*/ .unionContainer .markdown-body .help-code-block pre { font-size: 12px !important; } /\* Reduce code block font size in tables to make table information more compact \*/ .unionContainer .markdown-body .help-code-block pre code { font-size: 12px !important; } /\*\* API Reference tables \*\*/ .aliyun-docs-content table.api-reference tr td:first-child { margin: 0px; border-bottom: 1px solid #d8d8d8; } .aliyun-docs-content table.api-reference tr:last-child td:first-child { border-bottom: none; } .aliyun-docs-content table.api-reference p { color: #6e6e80; } .aliyun-docs-content table.api-reference b, i { color: #181818; } .aliyun-docs-content table.api-reference .collapse { border: none; margin-top: 4px; margin-bottom: 4px; } .aliyun-docs-content table.api-reference .collapse .expandable-title-bold { padding: 0; } .aliyun-docs-content table.api-reference .collapse .expandable-title { padding: 0; } .aliyun-docs-content table.api-reference .collapse .expandable-title-bold .title { margin-left: 16px; } .aliyun-docs-content table.api-reference .collapse .expandable-title .title { margin-left: 16px; } .aliyun-docs-content table.api-reference .collapse .expandable-title-bold i.icon { position: absolute; color: #777; font-weight: 100; } .aliyun-docs-content table.api-reference .collapse .expandable-title i.icon { position: absolute; color: #777; font-weight: 100; } .aliyun-docs-content table.api-reference .collapse.expanded .expandable-content { padding: 10px 14px 10px 14px !important; margin: 0; border: 1px solid #e9e9e9; } .aliyun-docs-content table.api-reference .collapse .expandable-title-bold b { font-size: 13px; font-weight: normal; color: #6e6e80; } .aliyun-docs-content table.api-reference .collapse .expandable-title b { font-size: 13px; font-weight: normal; color: #6e6e80; } .aliyun-docs-content table.api-reference .tabbed-content-box { border: none; } .aliyun-docs-content table.api-reference .tabbed-content-box section { padding: 8px 0 !important; } .aliyun-docs-content table.api-reference .tabbed-content-box.mini .tab-box { /\* position: absolute; left: 40px; right: 0; \*/ } .aliyun-docs-content .margin-top-33 { margin-top: 33px !important; } .aliyun-docs-content .two-codeblocks pre { max-height: calc(50vh - 136px) !important; height: auto; } .expandable-content section { border-bottom: 1px solid #e9e9e9; padding-top: 6px; padding-bottom: 4px; } .expandable-content section:last-child { border-bottom: none; } .expandable-content section:first-child { padding-top: 0; }

/\* Display table as a column card similar to DingTalk docs \*/ table.help-table-card td { border: 10px solid #FFF !important; background: #F4F6F9; padding: 16px !important; vertical-align: top; } /\* Reduce code block margin in tables for a more compact layout \*/ .unionContainer .markdown-body table .help-code-block { margin: 0 !important; } /\* Reduce code block font size in tables for a more compact layout \*/ .unionContainer .markdown-body .help-code-block pre { font-size: 12px !important; } /\* Reduce code block font size in tables for a more compact layout \*/ .unionContainer .markdown-body .help-code-block pre code { font-size: 12px !important; } /\* Reduce top and bottom margin of blockquotes in tables to avoid sparse content \*/ .unionContainer .markdown-body table blockquote { margin: 4px 0 0 0; }

/\* ========================================= \*/ /\* 新增样式：带边框的表格 (api-table-border) \*/ /\* ========================================= \*/ /\* 1. 表格容器核心设置 \*/ .aliyun-docs-content table.api-table-border { border: 1px solid #d8d8d8 !important; /\* 表格外边框 \*/ border-collapse: collapse !important; /\* 合并边框，防止双线 \*/ width: 100% !important; /\* 宽度占满 \*/ margin: 10px 0 !important; /\* 上下间距 \*/ background-color: #fff !important; /\* 背景色 \*/ box-sizing: border-box !important; } /\* 2. 表头、表体、行设置 \*/ /\* 确保行本身没有干扰边框 \*/ .aliyun-docs-content table.api-table-border thead, .aliyun-docs-content table.api-table-border tbody, .aliyun-docs-content table.api-table-border tr { border: none !important; background-color: transparent !important; } /\* 3. 单元格设置 (th 和 td) \*/ /\* 这是边框显示的关键位置 \*/ .aliyun-docs-content table.api-table-border th, .aliyun-docs-content table.api-table-border td { border: 1px solid #d8d8d8 !important; /\* 单元格四周边框 \*/ padding: 8px 12px !important; /\* 内边距 \*/ text-align: left !important; /\* 文字左对齐 \*/ vertical-align: middle !important; /\* 垂直居中 \*/ color: #6e6e80 !important; /\* 文字颜色 \*/ font-size: 14px !important; /\* 字体大小 \*/ line-height: 1.5 !important; } /\* 4. 表头特殊样式 \*/ .aliyun-docs-content table.api-table-border th { background-color: #f9fafb !important; /\* 表头背景色 \*/ color: #181818 !important; /\* 表头文字颜色 \*/ font-weight: 600 !important; /\* 表头加粗 \*/ } /\* 5. 鼠标悬停效果 (可选) \*/ .aliyun-docs-content table.api-table-border tbody tr:hover td { background-color: #fcfcfc !important; /\* 悬停时背景微变 \*/ } /\* 6. 兼容原有 api-reference 可能存在的冲突 \*/ /\* 如果原有样式针对 td:first-child 等特殊选择器有干扰，这里强制覆盖 \*/ .aliyun-docs-content table.api-table-border tr td:first-child { border-bottom: 1px solid #d8d8d8 !important; margin: 0 !important; } .aliyun-docs-content table.api-table-border tr:last-child td:first-child { border-bottom: 1px solid #d8d8d8 !important; /\* 保持底部边框 \*/ }