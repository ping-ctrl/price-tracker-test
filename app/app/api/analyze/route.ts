import { NextRequest, NextResponse } from "next/server";
import pdf from "pdf-parse";
import fs from "fs";
import path from "path";

const dbPath = path.join(process.cwd(), "price_history.json");

function readHistoryData() {
  if (!fs.existsSync(dbPath)) return [];
  const fileContent = fs.readFileSync(dbPath, "utf-8");
  return JSON.parse(fileContent || "[]");
}

function writeHistoryData(data: any) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), "utf-8");
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) return NextResponse.json({ error: "No file uploaded." }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    let extractedText = "";
    if (file.name.toLowerCase().endsWith(".pdf")) {
      const pdfData = await pdf(buffer);
      extractedText = pdfData.text; 
    } else {
      return NextResponse.json({ error: "仅支持 PDF 价格表" }, { status: 400 });
    }

    // 正则表达式离线抓取数据
    const regex = /"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*"\s*\$(\d+)/g;
    const newExtractedItems = [];
    const currentWeekDate = new Date().toISOString().slice(0, 10);

    let match;
    while ((match = regex.exec(extractedText)) !== null) {
      const model = match[1].replace(/\s+/g, ' ').trim();
      const gb = match[2].trim();
      const grade = match[3].trim();
      const price = parseInt(match[4], 10);

      if (model.toLowerCase() !== "model") {
        newExtractedItems.push({
          itemName: `${model} (${gb}) [${grade}]`,
          supplier: "周更定配供应商",
          price: price,
          date: currentWeekDate
        });
      }
    }

    // 读取历史并追加
    const historyData = readHistoryData();
    let updatedHistory = [...historyData, ...newExtractedItems];

    // ⏳ 修复点：这里改为 120 天（4个月）滚动清理
    const oneHundredTwentyDaysAgo = new Date();
    oneHundredTwentyDaysAgo.setDate(oneHundredTwentyDaysAgo.getDate() - 120);
    const cutoffDateStr = oneHundredTwentyDaysAgo.toISOString().slice(0, 10);

    // 过滤保留 4 个月内的数据
    updatedHistory = updatedHistory.filter(item => item.date >= cutoffDateStr);
    writeHistoryData(updatedHistory);

    return NextResponse.json({
      success: true,
      allHistoryData: updatedHistory 
    });

  } catch (error) {
    console.error("后端处理失败:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}