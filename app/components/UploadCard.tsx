"use client";

import { useState } from "react";
import JSZip from "jszip";

export default function UploadCard() {
  const [fileName, setFileName] = useState("");
  const [pdfFiles, setPdfFiles] = useState<string[]>([]); // 存储解压出的 PDF 文件名列表
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // 1. 文件选择与解压函数
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setSelectedFile(file); 
    setPdfFiles([]); // 每次选择新文件时清空旧列表

    if (file.name.endsWith(".zip")) {
      try {
        const zip = await JSZip.loadAsync(file);
        const pdfs = Object.keys(zip.files).filter((name) =>
          name.toLowerCase().endsWith(".pdf")
        );
        setPdfFiles(pdfs);
      } catch (error) {
        console.error("解压 ZIP 文件失败:", error);
        alert("压缩包解析失败，请检查文件是否损坏。");
      }
    } else if (file.name.toLowerCase().endsWith(".pdf")) {
      setPdfFiles([file.name]);
    }
  }; // 👈 修复点：handleFileChange 在这里正确闭合

  // 2. 独立的分析提交函数
  const handleAnalyze = async () => {
    if (!selectedFile) {
      alert("Please select a file first!");
      return;
    }

    console.log("准备发送文件到后端进行分析:", selectedFile.name);

    // 创建 FormData 用来传输文件
    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      // 假设你的后端接口是 /api/analyze
      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        console.log("分析成功，后端返回的数据:", data);
        alert("Analysis complete!");
      } else {
        alert("Analysis failed.");
      }
    } catch (error) {
      console.error("发送文件失败:", error);
      alert("Error uploading file.");
    }
  };

  // 3. UI 渲染区域
  return (
    <div className="bg-white shadow-xl rounded-2xl p-10 w-[550px]">
      <h1 className="text-3xl font-bold text-center mb-8">
        📊 Supplier Price Tracker
      </h1>

      <label
        htmlFor="file-upload"
        className="border-2 border-dashed border-gray-300 rounded-xl p-10 flex flex-col items-center cursor-pointer hover:border-blue-500 transition"
      >
        <p className="text-gray-500 mb-5">
          Drag & Drop your ZIP or PDF here
        </p>

        <div className="bg-blue-600 text-white px-5 py-2 rounded-lg">
          Select File
        </div>

        <input
          id="file-upload"
          type="file"
          accept=".zip,.pdf"
          className="hidden"
          onChange={handleFileChange}
        />
      </label>

      {fileName && (
        <div className="mt-6 bg-green-50 border border-green-300 rounded-lg p-4">
          <p className="font-semibold text-green-700">
            ✅ {fileName}
          </p>

          <div className="text-sm text-gray-600 mt-1">
            Ready to Analyze
            
            {pdfFiles.length > 0 && (
              <div className="mt-4 border rounded-lg p-4 bg-gray-50">
                <p className="font-semibold mb-2">
                  📦 {pdfFiles.length} PDFs Found
                </p>

                <ul className="text-sm space-y-1">
                  {pdfFiles.map((pdf) => (
                    <li key={pdf}>✅ {pdf}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 修复点：这里成功绑定了 onClick={handleAnalyze} */}
      <button 
        onClick={handleAnalyze} 
        className="w-full mt-6 bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 transition"
      >
        Analyze
      </button>
    </div>
  );
}